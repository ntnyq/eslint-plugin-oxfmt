import { basename, dirname, isAbsolute, resolve } from 'node:path'
import process from 'node:process'
import { isString } from '@ntnyq/utils'
import { DEFAULT_IGNORED_DIRS, DEFAULT_IGNORED_LOCKFILES } from './constants'
import { collectGitignorePaths, resolveGitInfoExcludePath } from './git-ignore'
import {
  matchConfigIgnorePatterns,
  matchIgnoreFileChain,
} from './ignore-matchers'
import { loadOxfmtConfig } from './load-config'
import { splitPathSegments } from './path'
import type { IsOxfmtIgnoredOptions, IsOxfmtIgnoredResult } from './types'

/**
 * Resolve whether a file should be ignored using oxfmt-like CLI semantics.
 *
 * @param options - Ignore resolution options.
 * @returns Ignore status with optional reason.
 *
 * @example
 * ```ts
 * import { isOxfmtIgnored } from 'load-oxfmt-config'
 *
 * const result = await isOxfmtIgnored({
 *   cwd: process.cwd(),
 *   filepath: 'src/generated/file.ts',
 * })
 * ```
 */
export async function isOxfmtIgnored(
  options: IsOxfmtIgnoredOptions,
): Promise<IsOxfmtIgnoredResult> {
  const useCache = options.useCache !== false
  const includeConfigIgnorePatterns =
    options.includeConfigIgnorePatterns !== false
  const loadConfigForIgnorePatterns =
    options.loadConfigForIgnorePatterns !== false
  const cwd = resolve(options.cwd ?? process.cwd())
  const filepath = isAbsolute(options.filepath)
    ? resolve(options.filepath)
    : resolve(cwd, options.filepath)

  if (options.includeDefaultIgnores !== false) {
    const defaultResult = await resolveDefaultIgnores(
      filepath,
      cwd,
      options,
      useCache,
    )

    if (defaultResult.ignored) {
      return defaultResult
    }
  }

  if (!loadConfigForIgnorePatterns) {
    return {
      ignored: false,
    }
  }

  const configResult =
    options.loadedConfig ??
    (await loadOxfmtConfig({
      cwd,
      filepath,
      ...(options.disableNestedConfig === true
        ? { disableNestedConfig: true }
        : {}),
      ...(options.configPath ? { configPath: options.configPath } : {}),
      editorconfig: false,
      useCache,
    }))

  if (
    includeConfigIgnorePatterns &&
    configResult.dirname &&
    matchConfigIgnorePatterns(
      filepath,
      configResult.dirname,
      configResult.config.ignorePatterns,
      useCache,
    )
  ) {
    return {
      ignored: true,
      reason: 'config-ignore-patterns',
    }
  }

  return {
    ignored: false,
  }
}

/**
 * Check whether a file is under oxfmt's default ignored directories.
 *
 * @param filepath - Absolute file path to test.
 * @param options - Matching options.
 * @param options.withNodeModules - Whether node_modules should remain eligible.
 * @returns True when the path should be ignored by default directory rules.
 */
function isDefaultIgnoredDir(
  filepath: string,
  options: { withNodeModules?: boolean },
) {
  const directories = options.withNodeModules
    ? DEFAULT_IGNORED_DIRS.filter(dir => dir !== 'node_modules')
    : DEFAULT_IGNORED_DIRS
  const segments = splitPathSegments(dirname(filepath))

  return directories.some(dir => segments.includes(dir))
}

/**
 * Check whether a file is a default ignored lockfile.
 *
 * @param filepath - Absolute file path.
 * @returns True when the basename matches a default lockfile name.
 */
function isLockfile(filepath: string) {
  return DEFAULT_IGNORED_LOCKFILES.includes(basename(filepath))
}

/**
 * Evaluate global ignore rules separately from explicit config patterns.
 *
 * @param filepath - Absolute target file path.
 * @param cwd - Base directory for ignore file resolution.
 * @param options - Ignore file and node_modules settings.
 * @param useCache - Whether ignore matchers can be reused.
 * @returns Global ignore status.
 */
async function resolveDefaultIgnores(
  filepath: string,
  cwd: string,
  options: IsOxfmtIgnoredOptions,
  useCache: boolean,
): Promise<IsOxfmtIgnoredResult> {
  const ignorePaths = isString(options.ignorePath)
    ? [options.ignorePath]
    : (options.ignorePath ?? [])
  const explicitIgnoreEntries = ignorePaths.map(ignorePath => {
    const path = isAbsolute(ignorePath) ? ignorePath : resolve(cwd, ignorePath)

    return {
      baseDir: dirname(path),
      paths: [path],
    }
  })
  const explicitIgnoreMatch = explicitIgnoreEntries.length
    ? await matchIgnoreFileChain(filepath, explicitIgnoreEntries, useCache, {
        required: true,
      })
    : undefined

  const defaultIgnoredDirOptions = options.withNodeModules
    ? { withNodeModules: true }
    : {}

  if (isDefaultIgnoredDir(filepath, defaultIgnoredDirOptions)) {
    return {
      ignored: true,
      reason: 'default-dir',
    }
  }

  if (isLockfile(filepath)) {
    return {
      ignored: true,
      reason: 'lockfile',
    }
  }

  const { paths: gitignorePaths, repoRoot } = await collectGitignorePaths(
    filepath,
    useCache,
  )
  const gitignoreEntries = [...gitignorePaths].reverse().map(path => ({
    baseDir: dirname(path),
    paths: [path],
  }))
  const infoExcludePath = repoRoot
    ? await resolveGitInfoExcludePath(repoRoot, useCache)
    : undefined

  if (infoExcludePath) {
    // Both files are rooted at the repository, with .gitignore taking precedence.
    gitignoreEntries[0]?.paths.unshift(infoExcludePath)
  }

  const gitignoreMatch = await matchIgnoreFileChain(
    filepath,
    gitignoreEntries,
    useCache,
    { stopAtIgnoredDirectory: true },
  )

  if (gitignoreMatch) {
    return {
      ignored: true,
      reason:
        gitignoreMatch === infoExcludePath ? 'git-info-exclude' : 'gitignore',
    }
  }

  if (explicitIgnoreMatch) {
    return {
      ignored: true,
      reason: 'ignore-path',
    }
  }

  if (
    explicitIgnoreEntries.length === 0 &&
    (await matchIgnoreFileChain(
      filepath,
      [{ baseDir: cwd, paths: [resolve(cwd, '.prettierignore')] }],
      useCache,
    ))
  ) {
    return {
      ignored: true,
      reason: 'prettierignore',
    }
  }

  return {
    ignored: false,
  }
}
