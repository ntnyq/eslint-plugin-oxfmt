// @ts-check

import { dirname, isAbsolute, join, relative } from 'node:path'
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
 * @typedef {import('load-oxfmt-config').OxfmtConfigOverride} Override
 */
/**
 * @typedef {import('load-oxfmt-config').OxfmtOptions & PluginOptions} Options
 */

/**
 * @typedef {object} ResolvedBaseOptions
 * @property {import('oxfmt').FormatConfig} baseOptions Resolved base formatter options.
 */

/** @type {Map<string, Promise<ResolvedBaseOptions>>} */
const resolvedBaseOptionsCache = new Map()

/** @type {Map<string, import('oxfmt').FormatConfig>} */
const mergedOptionsCache = new Map()

/**
 * Apply overrides to the base options based on the filename
 * @param filename - The file path
 * @param cwd - Base directory for glob matching
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
 * Resolve an effective config path for a file.
 * - Absolute paths are returned as-is.
 * - Relative paths are resolved from cwd.
 *
 * @param cwd - Current working directory from ESLint context.
 * @param [configPath] - Optional user-provided config path.
 * @returns Absolute config path when provided, otherwise undefined.
 */
function getConfigPathForFile(
  /** @type {string} */
  cwd,
  /** @type {string | undefined} */
  configPath,
) {
  if (!configPath) {
    return undefined
  }

  return isAbsolute(configPath) ? configPath : join(cwd, configPath)
}

/**
 * Build cache key for merged options per file invocation.
 * The key includes filename, cwd, resolved base options, and rule-level
 * override inputs to avoid stale cache hits.
 *
 * @param filename - Current file path.
 * @param cwd - Base directory used for glob matching.
 * @param formatOptions - Base options used for formatting.
 * @param ignorePatterns - Rule-level ignore patterns.
 * @param overrides - Rule-level override entries.
 * @param useConfig - Whether config file loading is enabled.
 * @returns Serialized cache key.
 */
function getMergedOptionsCacheKey(
  /** @type {string} */
  filename,
  /** @type {string} */
  cwd,
  /** @type {import('oxfmt').FormatConfig} */
  formatOptions,
  /** @type {string[] | undefined} */
  ignorePatterns,
  /** @type {Override[] | undefined} */
  overrides,
  /** @type {boolean} */
  useConfig,
) {
  return JSON.stringify({
    cwd,
    filename,
    formatOptions,
    ignorePatterns,
    overrides,
    useConfig,
  })
}

/**
 * Build cache key for resolving base formatter options.
 * The key includes file directory and all resolution inputs.
 *
 * @param filename - Current file path.
 * @param cwd - Current working directory from ESLint context.
 * @param configPath - Optional user-provided config path.
 * @param useConfig - Whether config file loading is enabled.
 * @param formatOptions - Rule-level format options.
 * @returns Serialized cache key.
 */
function getResolvedBaseOptionsCacheKey(
  /** @type {string} */
  filename,
  /** @type {string} */
  cwd,
  /** @type {string | undefined} */
  configPath,
  /** @type {boolean} */
  useConfig,
  /** @type {import('oxfmt').FormatConfig} */
  formatOptions,
) {
  return JSON.stringify({
    configPath: configPath || '',
    cwd,
    fileDir: dirname(filename),
    formatOptions,
    useConfig,
  })
}

/**
 * Resolve base formatter options for a file and cache the async result.
 *
 * @param filename - Current file path.
 * @param cwd - Current working directory from ESLint context.
 * @param configPath - Optional user-provided config path.
 * @param useConfig - Whether config file loading is enabled.
 * @param formatOptions - Rule-level format options.
 * @returns Base options after config loading and inline option merge.
 */
async function resolveBaseOptions(
  /** @type {string} */
  filename,
  /** @type {string} */
  cwd,
  /** @type {string | undefined} */
  configPath,
  /** @type {boolean} */
  useConfig,
  /** @type {import('oxfmt').FormatConfig} */
  formatOptions,
) {
  const cacheKey = getResolvedBaseOptionsCacheKey(
    filename,
    cwd,
    configPath,
    useConfig,
    formatOptions,
  )

  const cachedTask = resolvedBaseOptionsCache.get(cacheKey)
  if (cachedTask) {
    return cachedTask
  }

  const task = (async () => {
    const resolveFromDir = dirname(filename)

    if (!useConfig) {
      return {
        baseOptions: {
          ...formatOptions,
        },
      }
    }

    const resolvedConfigPath = getConfigPathForFile(cwd, configPath)
    const configOptions = await loadOxfmtConfig({
      configPath: resolvedConfigPath,
      cwd: resolveFromDir,
    })

    return {
      baseOptions: {
        ...configOptions,
        ...formatOptions,
      },
    }
  })()

  resolvedBaseOptionsCache.set(cacheKey, task)

  try {
    return await task
  } catch (err) {
    resolvedBaseOptionsCache.delete(cacheKey)
    throw err
  }
}

/**
 * Check if a file should be ignored based on ignorePatterns
 * @param filename - The file path
 * @param cwd - Base directory for glob matching
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

    const { baseOptions } = await resolveBaseOptions(
      filename,
      cwd,
      configPath,
      useConfig,
      formatOptions,
    )

    const mergedOptionsCacheKey = getMergedOptionsCacheKey(
      filename,
      cwd,
      baseOptions,
      ignorePatterns,
      overrides,
      useConfig,
    )

    const cachedMergedOptions = mergedOptionsCache.get(mergedOptionsCacheKey)
    if (cachedMergedOptions) {
      const cachedIgnorePatterns = /** @type {string[] | undefined} */ (
        cachedMergedOptions.ignorePatterns
      )

      if (
        shouldIgnoreFile(filename, cwd, ignorePatterns || cachedIgnorePatterns)
      ) {
        return { code: sourceText }
      }

      return format(filename, sourceText, cachedMergedOptions)
    }

    const baseIgnorePatterns = /** @type {string[] | undefined} */ (
      baseOptions.ignorePatterns
    )
    const baseOverrides = /** @type {Override[] | undefined} */ (
      baseOptions.overrides
    )

    if (shouldIgnoreFile(filename, cwd, ignorePatterns || baseIgnorePatterns)) {
      return { code: sourceText }
    }

    // Apply overrides based on filename
    const mergedOptions = applyOverrides(
      filename,
      cwd,
      baseOptions,
      useConfig ? baseOverrides : overrides,
    )

    mergedOptionsCache.set(mergedOptionsCacheKey, mergedOptions)

    const formatResult = await format(filename, sourceText, mergedOptions)
    return formatResult
  },
)
