// @ts-check

import { resolve } from 'node:path'

/**
 * @typedef {import('eslint-plugin-oxfmt').OxfmtWorkerOptions} WorkerOptions
 * @typedef {import('eslint-plugin-oxfmt').OxfmtPluginOptions & Pick<WorkerOptions, 'cwd'>} WorkerControlOptions
 * @typedef {import('load-oxfmt-config').OxfmtOptions} OxfmtOptions
 * @typedef {{pluginOptions: WorkerControlOptions, formatOptions: OxfmtOptions}} SplitOptionsResult
 */

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
 * Check whether a value is an array of strings.
 * @param {unknown} value - Value to validate.
 * @returns {value is string[]} Whether the value is a string array.
 */
export function isStringArray(value) {
  return Array.isArray(value) && value.every(item => typeof item === 'string')
}

/**
 * Resolve Tailwind paths before merging options from different sources.
 * @param {import('oxfmt').FormatConfig} options - Format options to normalize.
 * @param {string} baseDir - Config directory or ESLint cwd for inline options.
 * @returns {import('oxfmt').FormatConfig} Options with absolute Tailwind paths.
 */
export function resolveTailwindPaths(options, baseDir) {
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

  return {
    ...options,
    sortTailwindcss: resolved,
  }
}

/**
 * Split worker controls from oxfmt options, ignore patterns, and overrides.
 * @param {WorkerOptions} [options] - Raw worker options.
 * @returns {SplitOptionsResult} Split option buckets.
 */
export function splitOptions(options = {}) {
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
    pluginOptions: /** @type {WorkerControlOptions} */ (pluginOptions),
  }
}

/**
 * Validate plugin-only options before dispatching to helper libraries.
 * @param {WorkerControlOptions} pluginOptions - Plugin-only options.
 * @returns {void}
 * @throws {TypeError} If a supported plugin option has an invalid value type.
 */
export function validateWorkerOptions(pluginOptions) {
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
