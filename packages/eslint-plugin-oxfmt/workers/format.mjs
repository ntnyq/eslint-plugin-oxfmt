// @ts-check

import { basename, dirname, resolve } from 'node:path'
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
import { isPathOutsideBase, toRelativePosixPath } from './paths.mjs'

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
  const { controlOptions, oxfmtOptions: inlineOxfmtOptions } =
    splitOptions(options)

  validateWorkerOptions(controlOptions)

  const cwd = controlOptions.cwd
  const useConfig = controlOptions.useConfig !== false
  const useCache = controlOptions.useCache

  /**
   * Inline ignore patterns matched relative to ESLint cwd.
   * @type {string[] | undefined}
   */
  const ruleIgnorePatterns = isStringArray(inlineOxfmtOptions.ignorePatterns)
    ? inlineOxfmtOptions.ignorePatterns
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
    const ignoreOptions = {
      cwd,
      filepath: filename,
      ignorePath: controlOptions.ignorePath,
      includeDefaultIgnores: controlOptions.respectOxfmtDefaultIgnores,
      loadConfigForIgnorePatterns: false,
      useCache,
      withNodeModules: controlOptions.withNodeModules,
    }
    const ignoreResult = await isOxfmtIgnored(ignoreOptions)

    if (ignoreResult.ignored) {
      return {
        code: sourceText,
        ignored: true,
        reason: ignoreResult.reason,
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
    ...inlineRootOptions
  } = inlineOxfmtOptions
  let associations = ruleAssociations
  let associationMatchPath = toRelativePosixPath(inlineBaseDir, filename)
  /**
   * Effective formatter options with paths resolved against their source.
   * @type {import('oxfmt').FormatConfig}
   */
  let finalOptions = resolveTailwindPaths(inlineRootOptions, inlineBaseDir)

  if (useConfig) {
    const configOptions = {
      configPath: controlOptions.configPath,
      cwd: cwd ?? dirname(filename),
      disableNestedConfig: controlOptions.disableNestedConfig,
      filepath: filename,
      useCache,
    }
    const sourceConfig = await loadOxfmtConfig({
      ...configOptions,
      editorconfig: false,
    })

    if (ruleIgnorePatterns === undefined) {
      const ignoreResult = await isOxfmtIgnored({
        cwd: inlineBaseDir,
        filepath: filename,
        includeDefaultIgnores: false,
        loadedConfig: sourceConfig,
        useCache,
      })

      if (ignoreResult.ignored) {
        return {
          code: sourceText,
          ignored: true,
          reason: ignoreResult.reason,
        }
      }
    }

    const loaded = await loadOxfmtConfigForFile({
      ...configOptions,
      editorconfig: controlOptions.editorconfig,
      loadedConfig: sourceConfig,
    })
    const {
      associations: configAssociations,
      overrides: configOverrides,
      ...loadedConfig
    } = loaded.config

    overrideBaseDir = loaded.dirname ?? overrideBaseDir

    finalOptions = {
      ...resolveTailwindPaths(loadedConfig, overrideBaseDir),
      ...finalOptions,
    }

    const relativePath = toRelativePosixPath(overrideBaseDir, filename)
    // Oxfmt uses the full path when the config directory is not a prefix.
    const configMatchPath = isPathOutsideBase(relativePath)
      ? resolve(filename).replaceAll('\\', '/')
      : relativePath

    if (ruleAssociations === undefined) {
      associations = configAssociations
      associationMatchPath = configMatchPath
    }

    finalOptions = applyOverrides(
      configMatchPath,
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
    associationMatchPath,
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
