// @ts-check

import { dirname, extname, relative, resolve } from 'node:path'
import ignore from 'ignore'
import { isOxfmtIgnored, loadOxfmtConfig } from 'load-oxfmt-config'
import { format } from 'oxfmt'
import picomatch from 'picomatch'
import { runAsWorker } from 'synckit'

/**
 * Options consumed by the worker instead of the formatter.
 * @typedef {object} PluginOnlyOptions
 * @property {string} [cwd] - Base working directory used for path resolution.
 * @property {string} [configPath] - Explicit path to oxfmt config file.
 * @property {string | string[]} [ignorePath] - One or more ignore file paths.
 * @property {boolean} [withNodeModules] - Whether node_modules should be included in ignore checks.
 * @property {boolean} [disableNestedConfig] - Disable per-file nested config lookup.
 * @property {boolean} [useCache] - Reuse caches for config/ignore resolution.
 * @property {boolean} [useConfig] - Whether config discovery/loading is enabled.
 * @property {boolean} [respectOxfmtDefaultIgnores] - Whether CLI-like default ignores should apply.
 * @property {import('load-oxfmt-config').LoadOxfmtConfigOptions['editorconfig']} [editorconfig] - EditorConfig loading strategy.
 */

/**
 * Formatting options, ignore patterns, and file-specific overrides.
 * @typedef {import('load-oxfmt-config').OxfmtOptions} OxfmtOptions
 */

/**
 * Combined rule options accepted by the worker.
 * @typedef {PluginOnlyOptions & import('load-oxfmt-config').LoadOxfmtConfigOptions & OxfmtOptions} PluginOptions
 */

/**
 * Result returned when ignore handling skips a file.
 * @typedef {object} WorkerIgnoredResult
 * @property {true} ignored - Indicates formatting was skipped due to ignore rules.
 * @property {import('load-oxfmt-config').IsOxfmtIgnoredResult['reason']} [reason] - Ignore reason from resolution step.
 * @property {string} code - Unchanged source code.
 * @property {never} [errors] - Not present for ignored results.
 */

/**
 * Result returned after attempting to format a file.
 * @typedef {object} WorkerFormattedResult
 * @property {false} [ignored] - False or undefined when formatting was attempted.
 * @property {string} code - Formatted source code.
 * @property {unknown[]} [errors] - Optional formatter errors.
 */

/**
 * Worker response for either ignored or formatted source text.
 * @typedef {WorkerIgnoredResult | WorkerFormattedResult} WorkerFormatResult
 */

/**
 * Worker controls separated from formatting and file-matching options.
 * @typedef {object} SplitOptionsResult
 * @property {PluginOnlyOptions} pluginOptions - Plugin orchestration options.
 * @property {OxfmtOptions} formatOptions - Oxfmt options including ignorePatterns and overrides.
 */

/**
 * A file-matching override loaded from config or supplied inline.
 * @typedef {import('load-oxfmt-config').OxfmtConfigOverride} OxfmtConfigOverride
 */

/**
 * Maximum number of compiled matchers retained in each worker cache.
 * @type {number}
 */
const MAX_CACHE_SIZE = 200
/**
 * Option names consumed by worker orchestration.
 * @type {Set<string>}
 */
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
/**
 * Compiled override globs keyed by their ordered pattern list.
 * @type {Map<string, import('picomatch').Matcher>}
 */
const overrideMatcherCache = new Map()
/**
 * Compiled gitignore-style rules keyed by their ordered pattern list.
 * @type {Map<string, import('ignore').Ignore>}
 */
const ignoreMatcherCache = new Map()

/**
 * Apply override entries to a base options object.
 * @param {string} relativePath - Relative file path used for matching.
 * @param {import('oxfmt').FormatConfig} baseOptions - Base format options.
 * @param {OxfmtConfigOverride[] | undefined} overrides - Override entries.
 * @param {string} optionsBaseDir - Base directory for paths inside override options.
 * @returns {import('oxfmt').FormatConfig} Options after override merge.
 */
function applyOverrides(relativePath, baseOptions, overrides, optionsBaseDir) {
  if (!overrides?.length) {
    return baseOptions
  }

  /**
   * Format options after applying each matching override in order.
   * @type {import('oxfmt').FormatConfig}
   */
  let merged = baseOptions
  for (const override of overrides) {
    if (!override?.files?.length) {
      continue
    }

    const fileMatcher = getCachedOverrideMatcher(override.files)
    const matches = !!fileMatcher && fileMatcher(relativePath)

    const excludeMatcher = override.excludeFiles?.length
      ? getCachedOverrideMatcher(override.excludeFiles)
      : undefined
    const excluded = excludeMatcher ? excludeMatcher(relativePath) : false

    if (matches && !excluded && override.options) {
      merged = {
        ...merged,
        ...resolveTailwindPaths(override.options, optionsBaseDir),
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
  const useCache = getUseCacheOption(pluginOptions)

  /**
   * Inline ignore patterns matched relative to ESLint cwd.
   * @type {string[] | undefined}
   */
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
    /**
     * Config and ignore resolution settings for the current file.
     * @type {import('load-oxfmt-config').IsOxfmtIgnoredOptions}
     */
    const ignoredOptions = {
      configPath: pluginOptions.configPath,
      cwd,
      disableNestedConfig: pluginOptions.disableNestedConfig,
      filepath: filename,
      ignorePath: pluginOptions.ignorePath,
      includeConfigIgnorePatterns: useConfig,
      loadConfigForIgnorePatterns: useConfig,
      useCache,
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

  /**
   * Base directory for paths supplied in inline rule options.
   * @type {string}
   */
  const inlineBaseDir = cwd ?? dirname(filename)
  /**
   * Base for override globs and config-derived paths, updated after discovery.
   * @type {string}
   */
  let overrideBaseDir = inlineBaseDir
  /**
   * Inline overrides separated from root options to preserve merge order.
   * @type {OxfmtOptions}
   */
  const { overrides: ruleOverrides, ...inlineOptionsWithoutOverrides } =
    inlineFormatOptions
  /**
   * Effective formatter options with paths resolved against their source.
   * @type {import('oxfmt').FormatConfig}
   */
  let finalOptions = resolveTailwindPaths(
    inlineOptionsWithoutOverrides,
    inlineBaseDir,
  )

  if (useConfig) {
    const loaded = await loadOxfmtConfig({
      configPath: pluginOptions.configPath,
      cwd: cwd ?? dirname(filename),
      disableNestedConfig: pluginOptions.disableNestedConfig,
      editorconfig: pluginOptions.editorconfig,
      filepath: filename,
      useCache,
    })
    const { overrides: configOverrides, ...loadedConfig } = loaded.config
    overrideBaseDir = loaded.dirname ?? overrideBaseDir

    finalOptions = {
      ...resolveTailwindPaths(loadedConfig, overrideBaseDir),
      ...finalOptions,
    }
    finalOptions = applyOverrides(
      getRelativePath(overrideBaseDir, filename),
      finalOptions,
      configOverrides,
      overrideBaseDir,
    )
  }

  const overrideRelativePath = getRelativePath(overrideBaseDir, filename)
  finalOptions = applyOverrides(
    overrideRelativePath,
    finalOptions,
    Array.isArray(ruleOverrides) ? ruleOverrides : undefined,
    inlineBaseDir,
  )

  return format(filename, sourceText, finalOptions)
}

/**
 * Get or create a cached ignore matcher for oxfmt ignorePatterns.
 * @param {string[]} patterns - Gitignore-style patterns.
 * @returns {import('ignore').Ignore} Compiled ignore matcher.
 */
function getCachedIgnoreMatcher(patterns) {
  const key = patterns.join('\0')
  const cached = ignoreMatcherCache.get(key)
  if (cached) {
    return cached
  }

  const matcher = ignore().add(patterns)
  setCacheEntry(ignoreMatcherCache, key, matcher)
  return matcher
}

/**
 * Get or create a cached picomatch matcher for oxfmt override globs.
 * @param {string[]} patterns - Glob patterns.
 * @returns {import('picomatch').Matcher} Compiled matcher.
 * @throws {Error} If a pattern contains invalid glob syntax.
 */
function getCachedOverrideMatcher(patterns) {
  const key = patterns.join('\0')
  const cached = overrideMatcherCache.get(key)
  if (cached) {
    return cached
  }

  /**
   * Match oxfmt's dotfile and literal-extglob behavior.
   * @type {{dot: boolean, noextglob: boolean, strictBrackets: boolean}}
   */
  const matcherOptions = {
    dot: true,
    noextglob: true,
    strictBrackets: true,
  }

  for (const pattern of patterns) {
    try {
      picomatch(pattern, matcherOptions)
    } catch (error) {
      const details = error instanceof Error ? `: ${error.message}` : ''
      throw new Error(`Invalid glob pattern \`${pattern}\`${details}`, {
        cause: error,
      })
    }
  }

  const matcher = picomatch(patterns, matcherOptions)
  setCacheEntry(overrideMatcherCache, key, matcher)
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
 * Resolve the cache setting passed to load-oxfmt-config.
 * Explicit CommonJS config files need the loader's non-cached CJS path so
 * `module.exports = {}` configs are read as config objects.
 * @param {PluginOnlyOptions} pluginOptions - Plugin orchestration options.
 * @returns {boolean | undefined} Cache setting for config/ignore loading.
 */
function getUseCacheOption(pluginOptions) {
  if (
    pluginOptions.configPath &&
    extname(pluginOptions.configPath) === '.cjs'
  ) {
    return false
  }

  return pluginOptions.useCache
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
 * Resolve Tailwind paths before merging options from different sources.
 * @param {import('oxfmt').FormatConfig} options - Format options to normalize.
 * @param {string} baseDir - Config directory or ESLint cwd for inline options.
 * @returns {import('oxfmt').FormatConfig} Options with absolute Tailwind paths.
 */
function resolveTailwindPaths(options, baseDir) {
  const { sortTailwindcss } = options
  if (!sortTailwindcss || typeof sortTailwindcss !== 'object') {
    return options
  }

  /**
   * Copy paths before resolving them to avoid mutating cached config objects.
   * @type {import('oxfmt').SortTailwindcssConfig}
   */
  const resolved = { ...sortTailwindcss }
  if (resolved.config) {
    resolved.config = resolve(baseDir, resolved.config)
  }
  if (resolved.stylesheet) {
    resolved.stylesheet = resolve(baseDir, resolved.stylesheet)
  }

  return { ...options, sortTailwindcss: resolved }
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
 * Check if a file should be ignored by provided gitignore-style patterns.
 * @param {string} relativePath - Relative path against pattern base.
 * @param {string[] | undefined} ignorePatterns - Ordered gitignore-style patterns.
 * @returns {boolean} Whether file is ignored.
 */
function shouldIgnoreFile(relativePath, ignorePatterns) {
  if (!ignorePatterns?.length) {
    return false
  }

  const matcher = getCachedIgnoreMatcher(ignorePatterns)
  return matcher.ignores(relativePath)
}

/**
 * Split worker controls from oxfmt options, ignore patterns, and overrides.
 * @param {PluginOptions} [options] - Raw worker options.
 * @returns {SplitOptionsResult} Split option buckets.
 */
function splitOptions(options = {}) {
  /**
   * Options consumed by config loading and ignore orchestration.
   * @type {Record<string, unknown>}
   */
  const pluginOptions = {}
  /**
   * Remaining oxfmt options, including file-matching configuration.
   * @type {Record<string, unknown>}
   */
  const formatOptions = {}

  for (const [key, value] of Object.entries(options)) {
    if (PLUGIN_ONLY_OPTIONS.has(key)) {
      pluginOptions[key] = value
    } else {
      formatOptions[key] = value
    }
  }

  return {
    formatOptions: /** @type {OxfmtOptions} */ (formatOptions),
    pluginOptions: /** @type {PluginOnlyOptions} */ (pluginOptions),
  }
}

/**
 * Validate plugin-only options before dispatching to helper libraries.
 * @param {PluginOnlyOptions} pluginOptions - Plugin-only options.
 * @returns {void}
 * @throws {TypeError} If a supported plugin option has an invalid value type.
 */
function validatePluginOptions(pluginOptions) {
  /**
   * Plugin options validated as strings when provided.
   * @type {('cwd' | 'configPath')[]}
   */
  const stringKeys = ['configPath', 'cwd']
  /**
   * Plugin switches validated as booleans when provided.
   * @type {('disableNestedConfig' | 'respectOxfmtDefaultIgnores' | 'useConfig' | 'useCache' | 'withNodeModules')[]}
   */
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
