// @ts-check

import { dirname, relative } from 'node:path'
import { isOxfmtIgnored, loadOxfmtConfigResult } from 'load-oxfmt-config'
import { format } from 'oxfmt'
import picomatch from 'picomatch'
import { runAsWorker } from 'synckit'

/**
 * @typedef {object} PluginOnlyOptions
 * @property {string} [cwd] - Base working directory used for path resolution.
 * @property {string} [configPath] - Explicit path to oxfmt config file.
 * @property {string | string[]} [ignorePath] - One or more ignore file paths.
 * @property {boolean} [withNodeModules] - Whether node_modules should be included in ignore checks.
 * @property {boolean} [disableNestedConfig] - Disable per-file nested config lookup.
 * @property {boolean} [useCache] - Reuse caches for config/ignore resolution.
 * @property {boolean} [useConfig] - Whether config discovery/loading is enabled.
 * @property {boolean} [respectOxfmtDefaultIgnores] - Whether CLI-like default ignores should apply.
 * @property {import('load-oxfmt-config').Options['editorconfig']} [editorconfig] - EditorConfig loading strategy.
 */

/**
 * @typedef {PluginOnlyOptions & import('load-oxfmt-config').Options & import('oxfmt').FormatConfig} PluginOptions
 */

/**
 * @typedef {object} WorkerIgnoredResult
 * @property {true} ignored - Indicates formatting was skipped due to ignore rules.
 * @property {import('load-oxfmt-config').IsOxfmtIgnoredResult['reason']} [reason] - Ignore reason from resolution step.
 * @property {string} code - Unchanged source code.
 * @property {never} [errors] - Not present for ignored results.
 */

/**
 * @typedef {object} WorkerFormattedResult
 * @property {false} [ignored] - False or undefined when formatting was attempted.
 * @property {string} code - Formatted source code.
 * @property {unknown[]} [errors] - Optional formatter errors.
 */

/**
 * @typedef {WorkerIgnoredResult | WorkerFormattedResult} WorkerFormatResult
 */

/**
 * @typedef {object} SplitOptionsResult
 * @property {PluginOnlyOptions} pluginOptions - Plugin orchestration options.
 * @property {import('oxfmt').FormatConfig} formatOptions - Pure oxfmt options.
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

  if (pluginOptions.respectOxfmtDefaultIgnores !== false && cwd) {
    /** @type {import('load-oxfmt-config').IsOxfmtIgnoredOptions} */
    const ignoredOptions = {
      configPath: pluginOptions.configPath,
      cwd,
      disableNestedConfig: pluginOptions.disableNestedConfig,
      filepath: filename,
      ignorePath: pluginOptions.ignorePath,
      includeConfigIgnorePatterns: useConfig,
      loadConfigForIgnorePatterns: useConfig,
      useCache: pluginOptions.useCache,
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
    const configResolutionCwd = pluginOptions.configPath
      ? cwd
      : pluginOptions.disableNestedConfig
        ? cwd
        : dirname(filename)

    const loaded = await loadOxfmtConfigResult({
      configPath: pluginOptions.configPath,
      cwd: configResolutionCwd,
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
  /** @type {('cwd' | 'configPath')[]} */
  const stringKeys = ['configPath', 'cwd']
  /** @type {('disableNestedConfig' | 'respectOxfmtDefaultIgnores' | 'useConfig' | 'useCache' | 'withNodeModules')[]} */
  const booleanKeys = [
    'disableNestedConfig',
    'respectOxfmtDefaultIgnores',
    'useCache',
    'useConfig',
    'withNodeModules',
  ]

  for (const key of stringKeys) {
    const value = pluginOptions[key]
    if (value != null && typeof value !== 'string') {
      throw new TypeError(
        `oxfmt worker requires "${key}" to be a string when provided.`,
      )
    }
  }

  for (const key of booleanKeys) {
    const value = pluginOptions[key]
    if (value != null && typeof value !== 'boolean') {
      throw new TypeError(
        `oxfmt worker requires "${key}" to be a boolean when provided.`,
      )
    }
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
}

runAsWorker(formatViaOxfmt)
