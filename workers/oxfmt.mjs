// @ts-check

import { dirname, isAbsolute, join, relative } from 'node:path'
import { loadOxfmtConfig, resolveOxfmtrcPath } from 'load-oxfmt-config'
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
 * @property {string} configDir Directory of the resolved config file, used as base for config-derived glob patterns.
 */

const MAX_CACHE_SIZE = 1000

/**
 * Evict oldest entries when the cache exceeds MAX_CACHE_SIZE.
 * @param cache - The cache map to evict entries from
 */
function evictCache(
  /** @type {Map<string, unknown>} */
  cache,
) {
  if (cache.size <= MAX_CACHE_SIZE) {
    return
  }
  const keysToDelete = [...cache.keys()].slice(0, cache.size - MAX_CACHE_SIZE)
  for (const key of keysToDelete) {
    cache.delete(key)
  }
}

/**
 * JSON.stringify replacer that sorts object keys for stable serialization.
 * @param key - The key of the property being processed
 * @param value - The value of the property being processed
 * @returns - The value to be serialized, with object keys sorted if it's an object
 */
function stableReplacer(
  /** @type {string} */
  key,
  /** @type {unknown} */
  value,
) {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return Object.keys(value)
      .sort()
      .reduce((sorted, k) => {
        sorted[k] = /** @type {Record<string, unknown>} */ (value)[k]
        return sorted
      }, /** @type {Record<string, unknown>} */ ({}))
  }
  return value
}

/** @type {Map<string, Promise<ResolvedBaseOptions>>} */
const resolvedBaseOptionsCache = new Map()

/** @type {Map<string, import('oxfmt').FormatConfig>} */
const mergedOptionsCache = new Map()

/** @type {Map<string, ReturnType<typeof picomatch>>} */
const picomatchCache = new Map()

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
    const matches = getCachedMatcher(files)(relativePath)

    // Check if file is excluded
    const excluded =
      excludeFiles && excludeFiles.length > 0
        ? getCachedMatcher(excludeFiles)(relativePath)
        : false

    if (matches && !excluded && overrideOptions) {
      mergedOptions = { ...mergedOptions, ...overrideOptions }
      hasOverrides = true
    }
  }

  return hasOverrides ? mergedOptions : baseOptions
}

/**
 * Get or create a cached picomatch matcher for the given patterns.
 * @param patterns - Glob patterns to match against file paths
 * @returns - Picomatch matcher function
 */
function getCachedMatcher(
  /** @type {string | string[]} */
  patterns,
) {
  const key = Array.isArray(patterns) ? patterns.join('\0') : patterns
  const cached = picomatchCache.get(key)
  if (cached) {
    return cached
  }
  const matcher = picomatch(patterns)
  picomatchCache.set(key, matcher)
  evictCache(picomatchCache)
  return matcher
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
 * The key includes filename, cwd, configDir, resolved base options, and rule-level
 * override inputs to avoid stale cache hits.
 *
 * @param filename - Current file path.
 * @param cwd - Base directory used for rule-level glob matching.
 * @param configDir - Directory of the resolved config file, used for config-derived glob matching.
 * @param baseOptions - Resolved base options used for formatting.
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
  /** @type {string} */
  configDir,
  /** @type {import('oxfmt').FormatConfig} */
  baseOptions,
  /** @type {string[] | undefined} */
  ignorePatterns,
  /** @type {Override[] | undefined} */
  overrides,
  /** @type {boolean} */
  useConfig,
) {
  return JSON.stringify(
    {
      baseOptions,
      configDir,
      cwd,
      filename,
      ignorePatterns,
      overrides,
      useConfig,
    },
    stableReplacer,
  )
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
  return JSON.stringify(
    {
      configPath: configPath || '',
      cwd,
      fileDir: dirname(filename),
      formatOptions,
      useConfig,
    },
    stableReplacer,
  )
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

  /** @type {Promise<ResolvedBaseOptions>} */
  const task = (async () => {
    const resolveFromDir = dirname(filename)

    if (!useConfig) {
      return {
        configDir: cwd,
        baseOptions: {
          ...formatOptions,
        },
      }
    }

    const resolvedConfigPath = getConfigPathForFile(cwd, configPath)
    const resolvedPath = await resolveOxfmtrcPath(
      resolveFromDir,
      resolvedConfigPath,
    )
    const configDir = resolvedPath ? dirname(resolvedPath) : cwd
    const configOptions = await loadOxfmtConfig({
      configPath: resolvedConfigPath,
      cwd: resolveFromDir,
    })

    return {
      configDir,
      baseOptions: {
        ...configOptions,
        ...formatOptions,
      },
    }
  })()

  resolvedBaseOptionsCache.set(cacheKey, task)
  evictCache(resolvedBaseOptionsCache)

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
  return getCachedMatcher(ignorePatterns)(relativePath)
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

    const { baseOptions, configDir } = await resolveBaseOptions(
      filename,
      cwd,
      configPath,
      useConfig,
      formatOptions,
    )

    const mergedOptionsCacheKey = getMergedOptionsCacheKey(
      filename,
      cwd,
      configDir,
      baseOptions,
      ignorePatterns,
      overrides,
      useConfig,
    )

    const baseIgnorePatterns = /** @type {string[] | undefined} */ (
      baseOptions.ignorePatterns
    )
    const effectiveIgnorePatterns = ignorePatterns ?? baseIgnorePatterns
    const ignoreBase = ignorePatterns == null ? configDir : cwd

    if (shouldIgnoreFile(filename, ignoreBase, effectiveIgnorePatterns)) {
      return { code: sourceText }
    }

    const cachedMergedOptions = mergedOptionsCache.get(mergedOptionsCacheKey)
    if (cachedMergedOptions) {
      return format(filename, sourceText, cachedMergedOptions)
    }

    const baseOverrides = /** @type {Override[] | undefined} */ (
      baseOptions.overrides
    )

    // Apply config-level overrides (relative to config directory)
    let mergedOptions = baseOptions
    if (useConfig && baseOverrides && baseOverrides.length > 0) {
      mergedOptions = applyOverrides(
        filename,
        configDir,
        mergedOptions,
        baseOverrides,
      )
    }

    // Apply rule-level overrides (relative to ESLint cwd)
    if (!useConfig && overrides && overrides.length > 0) {
      mergedOptions = applyOverrides(filename, cwd, mergedOptions, overrides)
    }

    mergedOptionsCache.set(mergedOptionsCacheKey, mergedOptions)
    evictCache(mergedOptionsCache)

    return format(filename, sourceText, mergedOptions)
  },
)
