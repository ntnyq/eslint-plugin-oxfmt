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
 * @typedef {object} WorkerOptions
 * @property {string} cwd Current working directory for resolving rule-relative inputs.
 * @property {string | undefined} configPath Custom path to an oxfmt configuration file.
 * @property {string[] | undefined} ignorePatterns Rule-level ignore patterns.
 * @property {Override[] | undefined} overrides Rule-level override entries.
 * @property {boolean} useConfig Whether config loading is enabled.
 * @property {import('oxfmt').FormatConfig} formatOptions Pure formatter options passed to oxfmt.
 */

/**
 * @typedef {object} ResolvedBaseOptions
 * @property {import('oxfmt').FormatConfig} formatOptions Resolved base formatter options.
 * @property {string[] | undefined} ignorePatterns Resolved ignore patterns from config loading.
 * @property {Override[] | undefined} overrides Resolved overrides from config loading.
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
 * @param relativePath - The file path relative to the glob base directory
 * @param baseOptions - Base format options
 * @param [overrides] - Override configurations
 * @returns - Merged options
 */
function applyOverrides(
  /** @type {string} */
  relativePath,
  /** @type {import('oxfmt').FormatConfig} */
  baseOptions,
  /** @type {Override[] | undefined} */
  overrides,
) {
  if (!overrides || overrides.length === 0) {
    return baseOptions
  }

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
 * The key only includes data that can affect the final formatter options.
 *
 * @param baseOptions - Resolved base options used for formatting.
 * @param relativePath - File path relative to the override base directory.
 * @param overrides - Rule-level override entries.
 * @returns Serialized cache key.
 */
function getMergedOptionsCacheKey(
  /** @type {import('oxfmt').FormatConfig} */
  baseOptions,
  /** @type {string | undefined} */
  relativePath,
  /** @type {Override[] | undefined} */
  overrides,
) {
  const hasOverrides = !!(overrides && overrides.length > 0)

  return JSON.stringify(
    {
      baseOptions,
      overrides: hasOverrides ? overrides : undefined,
      relativePath: hasOverrides ? relativePath : undefined,
    },
    stableReplacer,
  )
}

/**
 * Normalize a file path relative to the provided base directory.
 * @param baseDir - Base directory used for glob evaluation
 * @param filename - Absolute file path
 * @returns - Normalized relative path using forward slashes
 */
function getRelativePath(
  /** @type {string} */
  baseDir,
  /** @type {string} */
  filename,
) {
  return relative(baseDir, filename).replace(/\\/g, '/')
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
 * Validate and normalize worker invocation options.
 * @param options - Raw worker options
 * @returns - Validated worker options
 */
function getWorkerOptions(
  /** @type {Options | undefined} */
  options,
) {
  if (!options || typeof options !== 'object') {
    throw new TypeError('oxfmt worker expected an options object.')
  }

  const {
    configPath,
    cwd,
    ignorePatterns,
    overrides,
    useConfig = true,
    ...formatOptions
  } = options

  if (typeof cwd !== 'string' || cwd.length === 0) {
    throw new TypeError('oxfmt worker requires a non-empty "cwd" option.')
  }
  if (configPath != null && typeof configPath !== 'string') {
    throw new TypeError(
      'oxfmt worker requires "configPath" to be a string when provided.',
    )
  }
  if (ignorePatterns != null && !isStringArray(ignorePatterns)) {
    throw new TypeError(
      'oxfmt worker requires "ignorePatterns" to be an array of strings when provided.',
    )
  }
  if (overrides != null && !Array.isArray(overrides)) {
    throw new TypeError(
      'oxfmt worker requires "overrides" to be an array when provided.',
    )
  }
  if (typeof useConfig !== 'boolean') {
    throw new TypeError(
      'oxfmt worker requires "useConfig" to be a boolean when provided.',
    )
  }

  return {
    configPath,
    cwd,
    formatOptions,
    ignorePatterns,
    overrides,
    useConfig,
  }
}

/**
 * Check whether a value is an array of strings.
 * @param value - Value to validate
 * @returns - Whether the value is a string array
 */
function isStringArray(
  /** @type {unknown} */
  value,
) {
  return Array.isArray(value) && value.every(item => typeof item === 'string')
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
        ignorePatterns: undefined,
        overrides: undefined,
        formatOptions: {
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
    const { ignorePatterns, overrides, ...loadedFormatOptions } =
      configOptions ?? {}

    return {
      configDir,
      ignorePatterns,
      overrides,
      formatOptions: {
        ...loadedFormatOptions,
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
 * @param relativePath - The file path relative to the glob base directory
 * @param [ignorePatterns] - Ignore patterns
 * @returns - Whether the file should be ignored
 */
function shouldIgnoreFile(
  /** @type {string} */
  relativePath,
  /** @type {string[] | undefined} */ ignorePatterns,
) {
  if (!ignorePatterns || ignorePatterns.length === 0) {
    return false
  }

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
      formatOptions,
      ignorePatterns,
      overrides,
      useConfig,
    } = getWorkerOptions(options)

    const {
      configDir,
      formatOptions: baseFormatOptions,
      ignorePatterns: baseIgnorePatterns,
      overrides: baseOverrides,
    } = await resolveBaseOptions(
      filename,
      cwd,
      configPath,
      useConfig,
      formatOptions,
    )
    const effectiveIgnorePatterns = ignorePatterns ?? baseIgnorePatterns
    const ignoreBase = ignorePatterns == null ? configDir : cwd
    const ignoreRelativePath = effectiveIgnorePatterns?.length
      ? getRelativePath(ignoreBase, filename)
      : undefined

    if (
      ignoreRelativePath &&
      shouldIgnoreFile(ignoreRelativePath, effectiveIgnorePatterns)
    ) {
      return { code: sourceText }
    }

    const effectiveOverrides = useConfig ? baseOverrides : overrides
    const overrideBase = useConfig ? configDir : cwd
    const overrideRelativePath = effectiveOverrides?.length
      ? getRelativePath(overrideBase, filename)
      : undefined
    const mergedOptionsCacheKey = getMergedOptionsCacheKey(
      baseFormatOptions,
      overrideRelativePath,
      effectiveOverrides,
    )

    const cachedMergedOptions = mergedOptionsCache.get(mergedOptionsCacheKey)
    if (cachedMergedOptions) {
      return format(filename, sourceText, cachedMergedOptions)
    }

    let mergedOptions = baseFormatOptions
    if (overrideRelativePath && effectiveOverrides?.length) {
      mergedOptions = applyOverrides(
        overrideRelativePath,
        mergedOptions,
        effectiveOverrides,
      )
    }

    mergedOptionsCache.set(mergedOptionsCacheKey, mergedOptions)
    evictCache(mergedOptionsCache)

    return format(filename, sourceText, mergedOptions)
  },
)
