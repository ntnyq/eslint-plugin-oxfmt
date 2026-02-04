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
  /** @type {import('oxfmt').FormatOptions} */
  baseOptions,
  /** @type {Override[] | undefined} */
  overrides,
) {
  if (!overrides || overrides.length === 0) {
    return baseOptions
  }

  // Get relative path from cwd and normalize to forward slashes for cross-platform compatibility
  const relativePath = relative(cwd, filename).replace(/\\/g, '/')

  let mergedOptions = { ...baseOptions }

  // Apply overrides in order (later overrides take precedence)
  for (const override of overrides) {
    const { excludeFiles, files, options: overrideOptions } = override

    // Check if file matches the files patterns
    const isMatchFiles = picomatch(files)
    const matches = isMatchFiles(relativePath)

    // Check if file is excluded
    let excluded = false
    if (excludeFiles && excludeFiles.length > 0) {
      const isMatchExclude = picomatch(excludeFiles)
      excluded = isMatchExclude(relativePath)
    }

    if (matches && !excluded && overrideOptions) {
      mergedOptions = { ...mergedOptions, ...overrideOptions }
    }
  }

  return mergedOptions
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
    /**'
     * @type {Options} format options
     */
    options,
  ) => {
    const {
      configPath,
      cwd,
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
