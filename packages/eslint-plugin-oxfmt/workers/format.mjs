// @ts-check

import { basename, dirname } from 'node:path'
import {
  isOxfmtIgnored,
  loadOxfmtConfig,
  loadOxfmtConfigForFile,
} from 'load-oxfmt-config'
import { format } from 'oxfmt'
import {
  ASSOCIATION_EXCLUDED_FILENAMES,
  resolveAssociationFilename,
} from './associations.mjs'
import { shouldIgnoreFile } from './matchers.mjs'
import {
  isStringArray,
  resolveTailwindPaths,
  splitOptions,
  validateWorkerOptions,
} from './options.mjs'
import { applyOverrides } from './overrides.mjs'
import { toRelativePosixPath } from './paths.mjs'

/**
 * @typedef {import('eslint-plugin-oxfmt').OxfmtWorkerOptions} WorkerOptions
 * @typedef {import('eslint-plugin-oxfmt').WorkerFormatResult} WorkerFormatResult
 * @typedef {import('load-oxfmt-config').OxfmtOptions} OxfmtOptions
 */

/**
 * Format source text via oxfmt with CLI-parity ignore orchestration.
 * @param {string} filename - File path passed from ESLint.
 * @param {string} sourceText - Source text to format.
 * @param {WorkerOptions} [options] - Worker options.
 * @returns {Promise<WorkerFormatResult>} Format result.
 */
export async function formatViaOxfmt(filename, sourceText, options = {}) {
  const { formatOptions: inlineFormatOptions, pluginOptions } =
    splitOptions(options)
  validateWorkerOptions(pluginOptions)

  const cwd = pluginOptions.cwd
  const useConfig = pluginOptions.useConfig !== false
  const useCache = pluginOptions.useCache

  /**
   * Inline ignore patterns matched relative to ESLint cwd.
   * @type {string[] | undefined}
   */
  const ruleIgnorePatterns = isStringArray(inlineFormatOptions.ignorePatterns)
    ? inlineFormatOptions.ignorePatterns
    : undefined

  if (ruleIgnorePatterns?.length && cwd) {
    const ruleRelativePath = toRelativePosixPath(cwd, filename)
    if (shouldIgnoreFile(ruleRelativePath, ruleIgnorePatterns)) {
      return {
        code: sourceText,
        ignored: true,
      }
    }
  }

  if (cwd) {
    /**
     * Config and ignore resolution settings for the current file.
     * @type {import('load-oxfmt-config').IsOxfmtIgnoredOptions}
     */
    const ignoredOptions = {
      cwd,
      filepath: filename,
      ignorePath: pluginOptions.ignorePath,
      includeDefaultIgnores: pluginOptions.respectOxfmtDefaultIgnores,
      loadConfigForIgnorePatterns: false,
      useCache,
      withNodeModules: pluginOptions.withNodeModules,
    }
    const ignored = await isOxfmtIgnored(ignoredOptions)

    if (ignored.ignored) {
      return {
        code: sourceText,
        ignored: true,
        reason: ignored.reason,
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
  const {
    associations: ruleAssociations,
    overrides: ruleOverrides,
    ...inlineOptionsWithoutOverrides
  } = inlineFormatOptions
  let associations = ruleAssociations
  let associationBaseDir = inlineBaseDir
  /**
   * Effective formatter options with paths resolved against their source.
   * @type {import('oxfmt').FormatConfig}
   */
  let finalOptions = resolveTailwindPaths(
    inlineOptionsWithoutOverrides,
    inlineBaseDir,
  )

  if (useConfig) {
    const configOptions = {
      configPath: pluginOptions.configPath,
      cwd: cwd ?? dirname(filename),
      disableNestedConfig: pluginOptions.disableNestedConfig,
      filepath: filename,
      useCache,
    }
    const sourceConfig = await loadOxfmtConfig({
      ...configOptions,
      editorconfig: false,
    })
    if (ruleIgnorePatterns === undefined) {
      const ignored = await isOxfmtIgnored({
        cwd: inlineBaseDir,
        filepath: filename,
        includeDefaultIgnores: false,
        loadedConfig: sourceConfig,
        useCache,
      })
      if (ignored.ignored) {
        return {
          code: sourceText,
          ignored: true,
          reason: ignored.reason,
        }
      }
    }
    const loaded = await loadOxfmtConfigForFile({
      ...configOptions,
      editorconfig: pluginOptions.editorconfig,
      loadedConfig: sourceConfig,
    })
    const {
      associations: configAssociations,
      overrides: configOverrides,
      ...loadedConfig
    } = loaded.config
    overrideBaseDir = loaded.dirname ?? overrideBaseDir
    if (ruleAssociations === undefined) {
      associations = configAssociations
      associationBaseDir = overrideBaseDir
    }

    finalOptions = {
      ...resolveTailwindPaths(loadedConfig, overrideBaseDir),
      ...finalOptions,
    }
    finalOptions = applyOverrides(
      toRelativePosixPath(overrideBaseDir, filename),
      finalOptions,
      configOverrides,
      overrideBaseDir,
    )
  }

  const overrideRelativePath = toRelativePosixPath(overrideBaseDir, filename)
  finalOptions = applyOverrides(
    overrideRelativePath,
    finalOptions,
    Array.isArray(ruleOverrides) ? ruleOverrides : undefined,
    inlineBaseDir,
  )

  const formatFilename = resolveAssociationFilename(
    filename,
    associations,
    associationBaseDir,
  )
  if (
    formatFilename !== filename &&
    ASSOCIATION_EXCLUDED_FILENAMES.has(basename(filename))
  ) {
    return {
      code: sourceText,
      ignored: true,
    }
  }
  const result = await format(formatFilename, sourceText, finalOptions)
  if (formatFilename !== filename) {
    for (const error of result.errors) {
      error.message = error.message.replaceAll(formatFilename, () => filename)
    }
  }
  return result
}
