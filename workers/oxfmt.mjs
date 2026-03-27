// @ts-check

import { relative } from 'node:path'
import { loadOxfmtConfig } from 'load-oxfmt-config'
import { format } from 'oxfmt'
import picomatch from 'picomatch'
import { runAsWorker } from 'synckit'

/**
 * @typedef {object} PluginOptions
 * @property {boolean} [useConfig] - Whether to use oxfmt configuration file
 * @property {string} cwd - Current working directory for resolving configuration
 * @property {string} [configPath] - Custom path to oxfmt configuration file
 */
/**
 * @typedef {import('load-oxfmt-config').FormatOptionOverride} Override
 */
/**
 * @typedef {import('load-oxfmt-config').OxfmtOptions & PluginOptions} Options
 */

/**
 * Apply overrides to the base options based on the filename
 * @param filename - The file path
 * @param cwd - Current working directory
 * @param baseOptions - Base format options
 * @param [overrides] - Override configurations
 * @returns - Merged options
 */
function applyOverrides(
  /** @type {string} */
  filename,
  /** @type {string} */
  cwd,
  /** @type {import('oxfmt').FormatConfig} */
  baseOptions,
  /** @type {Override[] | undefined} */
  overrides,
) {
  if (!overrides || overrides.length === 0) {
    return baseOptions
  }

  // Get relative path from cwd and normalize to forward slashes for cross-platform compatibility
  const relativePath = relative(cwd, filename).replace(/\\/g, '/')

  let mergedOptions = baseOptions
  let hasOverrides = false

  // Apply overrides in order (later overrides take precedence)
  for (const override of overrides) {
    const { excludeFiles, files, options: overrideOptions } = override

    // Check if file matches the files patterns
    const matches = picomatch.isMatch(relativePath, files)

    // Check if file is excluded
    const excluded =
      excludeFiles && excludeFiles.length > 0
        ? picomatch.isMatch(relativePath, excludeFiles)
        : false

    if (matches && !excluded && overrideOptions) {
      mergedOptions = { ...mergedOptions, ...overrideOptions }
      hasOverrides = true
    }
  }

  return hasOverrides ? mergedOptions : baseOptions
}

/**
 * Check if a file should be ignored based on ignorePatterns
 * @param filename - The file path
 * @param cwd - Current working directory
 * @param [ignorePatterns] - Ignore patterns
 * @returns - Whether the file should be ignored
 */
function shouldIgnoreFile(
  /** @type {string} */
  filename,
  /** @type {string} */
  cwd,
  /** @type {string[] | undefined} */
  ignorePatterns,
) {
  if (!ignorePatterns || ignorePatterns.length === 0) {
    return false
  }

  // Get relative path from cwd and normalize to forward slashes for cross-platform compatibility
  const relativePath = relative(cwd, filename).replace(/\\/g, '/')

  // Check if file matches any ignore pattern
  return picomatch.isMatch(relativePath, ignorePatterns)
}

runAsWorker(
  async (
    /**
     * @type {string} filename
     */
    filename,
    /**
     * @type {string} source text
     */
    sourceText,
    /**
     * @type {Options} format options
     */
    options,
  ) => {
    const {
      configPath,
      cwd,
      ignorePatterns,
      overrides,
      useConfig = true,
      ...formatOptions
    } = options

    // Load base options from config or use provided options
    const baseOptions = {
      ...(useConfig
        ? await loadOxfmtConfig({
            configPath,
            cwd,
          })
        : {}),
      ...formatOptions,
    }

    if (
      shouldIgnoreFile(
        filename,
        cwd,
        ignorePatterns || baseOptions.ignorePatterns,
      )
    ) {
      return { code: sourceText }
    }

    // Apply overrides based on filename
    const mergedOptions = applyOverrides(
      filename,
      cwd,
      baseOptions,
      useConfig ? baseOptions.overrides : overrides,
    )

    const formatResult = await format(filename, sourceText, mergedOptions)
    return formatResult
  },
)
