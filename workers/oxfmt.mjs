// @ts-check

import { readFile } from 'node:fs/promises'
import { dirname, isAbsolute, relative, resolve } from 'node:path'
import { isOxfmtIgnored, loadOxfmtConfigResult } from 'load-oxfmt-config'
import { format } from 'oxfmt'
import picomatch from 'picomatch'
import { runAsWorker } from 'synckit'

/**
 * @typedef {{cwd?: string, configPath?: string, ignorePath?: string | string[], withNodeModules?: boolean, disableNestedConfig?: boolean, useCache?: boolean, useConfig?: boolean, respectOxfmtDefaultIgnores?: boolean, editorconfig?: import('load-oxfmt-config').Options['editorconfig']}} PluginOnlyOptions
 */

/**
 * @typedef {PluginOnlyOptions & import('load-oxfmt-config').Options & import('oxfmt').FormatConfig} PluginOptions
 */

/**
 * @typedef {{ignored: true, reason?: import('load-oxfmt-config').IsOxfmtIgnoredResult['reason'], code: string, errors?: never} | {ignored?: false, code: string, errors?: unknown[]}} WorkerFormatResult
 */

/**
 * @typedef {{pluginOptions: PluginOnlyOptions, formatOptions: import('oxfmt').FormatConfig}} SplitOptionsResult
 */

/**
 * @typedef {import('load-oxfmt-config').OxfmtConfigOverride} OxfmtConfigOverride
 */

const MAX_CACHE_SIZE = 200
const PLUGIN_ONLY_OPTIONS = new Set([
  'configPath',
  'cwd',
  'disableNestedConfig',
  'editorconfig',
  'ignorePath',
  'respectOxfmtDefaultIgnores',
  'useCache',
  'useConfig',
  'withNodeModules',
])

/** @type {Map<string, Promise<string[]>>} */
const ignorePathPatternsCache = new Map()
/** @type {Map<string, import('picomatch').Matcher>} */
const matcherCache = new Map()

/**
 * Apply override entries to a base options object.
 * @param {string} relativePath - Relative file path used for matching.
 * @param {import('oxfmt').FormatConfig} baseOptions - Base format options.
 * @param {OxfmtConfigOverride[] | undefined} overrides - Override entries.
 * @returns {import('oxfmt').FormatConfig} Options after override merge.
 */
function applyOverrides(relativePath, baseOptions, overrides) {
  if (!overrides?.length) {
    return baseOptions
  }

  let merged = baseOptions
  for (const override of overrides) {
    if (!override?.files?.length) {
      continue
    }

    const fileMatcher = getCachedMatcher(override.files)
    const matches = !!fileMatcher && fileMatcher(relativePath)

    const excludeMatcher = override.excludeFiles?.length
      ? getCachedMatcher(override.excludeFiles)
      : undefined
    const excluded = excludeMatcher ? excludeMatcher(relativePath) : false

    if (matches && !excluded && override.options) {
      merged = {
        ...merged,
        ...override.options,
      }
    }
  }

  return merged
}

/**
 * Format source text via oxfmt with CLI-parity ignore orchestration.
 * @param {string} filename - File path passed from ESLint.
 * @param {string} sourceText - Source text to format.
 * @param {PluginOptions} [options] - Worker options.
 * @returns {Promise<WorkerFormatResult>} Format result.
 */
async function formatViaOxfmt(filename, sourceText, options = {}) {
  const { formatOptions: inlineFormatOptions, pluginOptions } =
    splitOptions(options)
  validatePluginOptions(pluginOptions)

  const cwd = pluginOptions.cwd
  const useConfig = pluginOptions.useConfig !== false
  const normalizedIgnorePath = normalizeIgnorePath(
    pluginOptions.ignorePath,
    cwd,
  )

  if (normalizedIgnorePath && cwd) {
    const ignorePathPatterns = await loadIgnorePathPatterns(
      normalizedIgnorePath,
      pluginOptions.useCache,
    )
    if (ignorePathPatterns.length > 0) {
      const relativePathFromCwd = getRelativePath(cwd, filename)
      const ignorePathMatcher = getCachedMatcher(ignorePathPatterns)
      if (ignorePathMatcher && ignorePathMatcher(relativePathFromCwd)) {
        return {
          code: sourceText,
          ignored: true,
          reason: 'ignore-path',
        }
      }
    }
  }

  const ruleIgnorePatterns = isStringArray(inlineFormatOptions.ignorePatterns)
    ? inlineFormatOptions.ignorePatterns
    : undefined

  if (ruleIgnorePatterns?.length && cwd) {
    const ruleRelativePath = getRelativePath(cwd, filename)
    if (shouldIgnoreFile(ruleRelativePath, ruleIgnorePatterns)) {
      return {
        code: sourceText,
        ignored: true,
      }
    }
  }

  if (pluginOptions.respectOxfmtDefaultIgnores !== false && useConfig) {
    /** @type {import('load-oxfmt-config').IsOxfmtIgnoredOptions & {useConfig?: boolean}} */
    const ignoredOptions = {
      configPath: pluginOptions.configPath,
      cwd,
      disableNestedConfig: pluginOptions.disableNestedConfig,
      filepath: filename,
      ignorePath: normalizedIgnorePath,
      useCache: pluginOptions.useCache,
      useConfig,
      withNodeModules: pluginOptions.withNodeModules,
    }
    const ignored = await isOxfmtIgnored(ignoredOptions)

    if (ignored.ignored) {
      if (
        ruleIgnorePatterns?.length &&
        ignored.reason === 'config-ignore-patterns'
      ) {
        // Rule-level ignorePatterns should take precedence over config ignorePatterns.
      } else {
        return {
          code: sourceText,
          ignored: true,
          reason: ignored.reason,
        }
      }
    }
  }

  /** @type {OxfmtConfigOverride[] | undefined} */
  let effectiveOverrides
  /** @type {string} */
  let overrideBaseDir = cwd ?? dirname(filename)
  /** @type {import('oxfmt').FormatConfig} */
  let finalOptions

  if (useConfig) {
    const loaded = await loadOxfmtConfigResult({
      configPath: pluginOptions.configPath,
      cwd: pluginOptions.disableNestedConfig ? cwd : dirname(filename),
      editorconfig: pluginOptions.editorconfig,
      useCache: pluginOptions.useCache,
    })
    const { overrides: configOverrides, ...loadedConfig } = loaded.config
    const { overrides: ruleOverrides, ...inlineOptionsWithoutOverrides } =
      inlineFormatOptions
    effectiveOverrides = [
      ...(configOverrides ?? []),
      ...(Array.isArray(ruleOverrides) ? ruleOverrides : []),
    ]
    overrideBaseDir = loaded.dirname ?? overrideBaseDir

    finalOptions = {
      ...loadedConfig,
      ...inlineOptionsWithoutOverrides,
    }
  } else {
    const { overrides: ruleOverrides, ...inlineOptionsWithoutOverrides } =
      inlineFormatOptions
    effectiveOverrides = Array.isArray(ruleOverrides)
      ? ruleOverrides
      : undefined
    finalOptions = {
      ...inlineOptionsWithoutOverrides,
    }
  }

  const overrideRelativePath = getRelativePath(overrideBaseDir, filename)
  finalOptions = applyOverrides(
    overrideRelativePath,
    finalOptions,
    effectiveOverrides,
  )

  return format(filename, sourceText, finalOptions)
}

/**
 * Get or create a cached picomatch matcher.
 * @param {string[]} patterns - Glob patterns.
 * @returns {import('picomatch').Matcher} Compiled matcher.
 */
function getCachedMatcher(patterns) {
  const key = patterns.join('\0')
  const cached = matcherCache.get(key)
  if (cached) {
    return cached
  }

  const matcher = picomatch(patterns)
  setCacheEntry(matcherCache, key, matcher)
  return matcher
}

/**
 * Normalize a file path relative to the provided base directory.
 * @param {string} baseDir - Base directory used for glob evaluation.
 * @param {string} filename - Absolute file path.
 * @returns {string} Relative path using forward slashes.
 */
function getRelativePath(baseDir, filename) {
  return relative(baseDir, filename).replace(/\\/g, '/')
}

/**
 * Check whether a value is an array of strings.
 * @param {unknown} value - Value to validate.
 * @returns {value is string[]} Whether the value is a string array.
 */
function isStringArray(value) {
  return Array.isArray(value) && value.every(item => typeof item === 'string')
}

/**
 * Load glob patterns from ignore files.
 * @param {string | string[]} ignorePath - Ignore file path(s).
 * @param {boolean | undefined} useCache - Whether to use worker cache.
 * @returns {Promise<string[]>} Loaded glob patterns.
 */
async function loadIgnorePathPatterns(ignorePath, useCache) {
  const paths = Array.isArray(ignorePath) ? ignorePath : [ignorePath]

  if (useCache === false) {
    const chunks = await Promise.all(
      paths.map(async filePath => {
        const content = await readFile(filePath, 'utf8')
        return content
          .split(/\r?\n/u)
          .map(line => line.trim())
          .filter(line => line.length > 0 && !line.startsWith('#'))
      }),
    )
    return chunks.flat()
  }

  const cacheKey = paths.join('\0')
  const cached = ignorePathPatternsCache.get(cacheKey)
  if (cached) {
    return cached
  }

  const task = (async () => {
    const chunks = await Promise.all(
      paths.map(async filePath => {
        const content = await readFile(filePath, 'utf8')
        return content
          .split(/\r?\n/u)
          .map(line => line.trim())
          .filter(line => line.length > 0 && !line.startsWith('#'))
      }),
    )

    return chunks.flat()
  })()

  setCacheEntry(ignorePathPatternsCache, cacheKey, task)
  try {
    return await task
  } catch (err) {
    ignorePathPatternsCache.delete(cacheKey)
    throw err
  }
}

/**
 * Normalize ignorePath(s) to absolute paths when cwd is available.
 * @param {string | string[] | undefined} ignorePath - Ignore path input.
 * @param {string | undefined} cwd - Current working directory.
 * @returns {string | string[] | undefined} Normalized ignore path input.
 */
function normalizeIgnorePath(ignorePath, cwd) {
  if (!ignorePath || !cwd) {
    return ignorePath
  }

  if (Array.isArray(ignorePath)) {
    return ignorePath.map(path =>
      isAbsolute(path) ? path : resolve(cwd, path),
    )
  }

  return isAbsolute(ignorePath) ? ignorePath : resolve(cwd, ignorePath)
}

/**
 * Store a value in a FIFO cache map with a bounded size.
 * @template T Cache value type.
 * @param {Map<string, T>} cache - Cache map.
 * @param {string} key - Cache key.
 * @param {T} value - Value to store.
 */
function setCacheEntry(cache, key, value) {
  cache.set(key, value)
  if (cache.size > MAX_CACHE_SIZE) {
    const oldestKey = cache.keys().next().value
    if (oldestKey != null) {
      cache.delete(oldestKey)
    }
  }
}

/**
 * Check if a file should be ignored by provided glob patterns.
 * @param {string} relativePath - Relative path against pattern base.
 * @param {string[] | undefined} ignorePatterns - Glob patterns.
 * @returns {boolean} Whether file is ignored.
 */
function shouldIgnoreFile(relativePath, ignorePatterns) {
  if (!ignorePatterns?.length) {
    return false
  }

  const matcher = getCachedMatcher(ignorePatterns)
  return !!matcher && matcher(relativePath)
}

/**
 * Split worker options into plugin orchestration options and pure format options.
 * @param {PluginOptions} [options] - Raw worker options.
 * @returns {SplitOptionsResult} Split option buckets.
 */
function splitOptions(options = {}) {
  /** @type {Record<string, unknown>} */
  const pluginOptions = {}
  /** @type {Record<string, unknown>} */
  const formatOptions = {}

  for (const [key, value] of Object.entries(options)) {
    if (PLUGIN_ONLY_OPTIONS.has(key)) {
      pluginOptions[key] = value
    } else {
      formatOptions[key] = value
    }
  }

  return {
    formatOptions: /** @type {import('oxfmt').FormatConfig} */ (formatOptions),
    pluginOptions: /** @type {PluginOnlyOptions} */ (pluginOptions),
  }
}

/**
 * Validate plugin-only options before dispatching to helper libraries.
 * @param {PluginOnlyOptions} pluginOptions - Plugin-only options.
 */
function validatePluginOptions(pluginOptions) {
  if (pluginOptions.cwd != null && typeof pluginOptions.cwd !== 'string') {
    throw new TypeError(
      'oxfmt worker requires "cwd" to be a string when provided.',
    )
  }
  if (
    pluginOptions.configPath != null &&
    typeof pluginOptions.configPath !== 'string'
  ) {
    throw new TypeError(
      'oxfmt worker requires "configPath" to be a string when provided.',
    )
  }
  if (
    pluginOptions.ignorePath != null &&
    typeof pluginOptions.ignorePath !== 'string' &&
    !isStringArray(pluginOptions.ignorePath)
  ) {
    throw new TypeError(
      'oxfmt worker requires "ignorePath" to be a string or string array when provided.',
    )
  }
  if (
    pluginOptions.useConfig != null &&
    typeof pluginOptions.useConfig !== 'boolean'
  ) {
    throw new TypeError(
      'oxfmt worker requires "useConfig" to be a boolean when provided.',
    )
  }
  if (
    pluginOptions.withNodeModules != null &&
    typeof pluginOptions.withNodeModules !== 'boolean'
  ) {
    throw new TypeError(
      'oxfmt worker requires "withNodeModules" to be a boolean when provided.',
    )
  }
  if (
    pluginOptions.disableNestedConfig != null &&
    typeof pluginOptions.disableNestedConfig !== 'boolean'
  ) {
    throw new TypeError(
      'oxfmt worker requires "disableNestedConfig" to be a boolean when provided.',
    )
  }
  if (
    pluginOptions.respectOxfmtDefaultIgnores != null &&
    typeof pluginOptions.respectOxfmtDefaultIgnores !== 'boolean'
  ) {
    throw new TypeError(
      'oxfmt worker requires "respectOxfmtDefaultIgnores" to be a boolean when provided.',
    )
  }
}

runAsWorker(formatViaOxfmt)
