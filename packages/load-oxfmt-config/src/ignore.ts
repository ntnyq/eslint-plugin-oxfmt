import { readFile, stat } from 'node:fs/promises'
import {
  basename,
  dirname,
  isAbsolute,
  join,
  relative,
  resolve,
} from 'node:path'
import process from 'node:process'
import ignore from 'ignore'
import { DEFAULT_IGNORED_DIRS, DEFAULT_IGNORED_LOCKFILES } from './constants'
import { loadOxfmtConfig } from './core'
import {
  cachePromise,
  getCacheValue,
  isPathOutsideBase,
  setCacheValue,
  splitPathSegments,
  toPosixPath,
} from './utils'
import type { Ignore } from 'ignore'
import type { IsOxfmtIgnoredOptions, IsOxfmtIgnoredResult } from './types'

/**
 * Cache parsed ignore file matchers by ignore file path.
 */
const ignoreMatcherCache = new Map<string, Promise<Ignore | undefined>>()

/**
 * Cache compiled matchers for config-level `ignorePatterns`.
 */
const configIgnoreMatcherCache = new Map<string, Ignore>()

/**
 * Match state from an ordered ignore file chain.
 */
interface IgnoreFileChainResult {
  /**
   * Final ignore state after applying all matching rules.
   */
  ignored: boolean
  /**
   * Whether any ignore or negation rule matched the file.
   */
  matched: boolean
}

/**
 * Ignore file descriptor with an optional matching base directory override.
 */
interface IgnoreFileEntry {
  /**
   * Absolute path to the ignore file.
   */
  path: string
  /**
   * Directory used to compute relative paths before matching.
   */
  baseDir?: string
}

/**
 * Loaded ignore matcher with its path matching base.
 */
interface LoadedIgnoreMatcher {
  /**
   * Directory used to compute relative paths before matching.
   */
  baseDir: string
  /**
   * Compiled ignore matcher.
   */
  matcher: Ignore
}

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

  const defaultIgnoredDirOptions = options.withNodeModules
    ? { withNodeModules: true }
    : {}

  if (isDefaultIgnoredDir(filepath, defaultIgnoredDirOptions)) {
    return { ignored: true, reason: 'default-dir' }
  }

  if (isLockfile(filepath)) {
    return { ignored: true, reason: 'lockfile' }
  }

  const normalizedIgnorePaths =
    typeof options.ignorePath === 'string'
      ? [options.ignorePath]
      : options.ignorePath
  const explicitIgnorePaths = normalizedIgnorePaths?.map(path =>
    resolveIgnoreFilePath(path, cwd),
  )

  const { paths: gitignorePaths, repoRoot } =
    await collectGitignorePaths(filepath)
  const gitignoreEntries = [...gitignorePaths].reverse().map(path => ({
    path,
  }))
  const gitignoreResult = await matchIgnoreFileChain(
    filepath,
    gitignoreEntries,
    useCache,
    true,
  )
  if (gitignoreResult.ignored) {
    return { ignored: true, reason: 'gitignore' }
  }

  if (repoRoot && !gitignoreResult.matched) {
    const infoExcludePath = await resolveGitInfoExcludePath(repoRoot)
    if (
      infoExcludePath &&
      (await matchIgnoreFile(filepath, infoExcludePath, useCache, repoRoot))
    ) {
      return { ignored: true, reason: 'git-info-exclude' }
    }
  }

  if (explicitIgnorePaths && explicitIgnorePaths.length > 0) {
    const explicitIgnoreEntries = explicitIgnorePaths.map(path => ({ path }))
    const explicitIgnoreResult = await matchIgnoreFileChain(
      filepath,
      explicitIgnoreEntries,
      useCache,
    )
    if (explicitIgnoreResult.ignored) {
      return { ignored: true, reason: 'ignore-path' }
    }
  } else {
    const prettierignorePath = resolve(cwd, '.prettierignore')
    if (await matchIgnoreFile(filepath, prettierignorePath, useCache)) {
      return { ignored: true, reason: 'prettierignore' }
    }
  }

  if (!loadConfigForIgnorePatterns) {
    return { ignored: false }
  }

  const configResult = await loadOxfmtConfig({
    cwd,
    filepath,
    ...(options.disableNestedConfig === true
      ? { disableNestedConfig: true }
      : {}),
    ...(options.configPath ? { configPath: options.configPath } : {}),
    editorconfig: false,
    useCache,
  })

  if (
    includeConfigIgnorePatterns &&
    configResult.dirname &&
    configResult.config.ignorePatterns &&
    configResult.config.ignorePatterns.length > 0 &&
    matchConfigIgnorePatterns(
      filepath,
      configResult.dirname,
      configResult.config.ignorePatterns,
      useCache,
    )
  ) {
    return { ignored: true, reason: 'config-ignore-patterns' }
  }

  return { ignored: false }
}

/**
 * Collect `.gitignore` files from file directory up to git repo boundary.
 *
 * @param filepath - Absolute file path to test.
 * @returns Collected ignore files and repo root when found.
 */
async function collectGitignorePaths(filepath: string) {
  const fileDir = dirname(filepath)
  const repoRoot = await findGitRepoRoot(fileDir)
  const paths: string[] = []
  let current = fileDir

  while (true) {
    paths.push(join(current, '.gitignore'))

    if (repoRoot && current === repoRoot) {
      break
    }

    const parent = dirname(current)
    if (parent === current) {
      break
    }

    current = parent
  }

  return { paths, repoRoot }
}

/**
 * Find the nearest git repo root by walking up from a start directory.
 *
 * @param fromDir - Directory to start from.
 * @returns Repo root directory, or undefined when no git boundary is found.
 */
async function findGitRepoRoot(fromDir: string) {
  let current = fromDir

  while (true) {
    if (await hasGitEntry(current)) {
      return current
    }

    const parent = dirname(current)
    if (parent === current) {
      return undefined
    }

    current = parent
  }
}

/**
 * Check whether a directory looks like a git repo root.
 *
 * A `.git` entry can be either a directory (regular repo) or a file (worktree/submodule).
 *
 * @param dir - Directory to inspect.
 * @returns True when `.git` exists under the directory.
 */
async function hasGitEntry(dir: string) {
  try {
    await stat(join(dir, '.git'))
    return true
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code
    if (code === 'ENOENT' || code === 'ENOTDIR') {
      return false
    }

    throw error
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
 * Read and parse an ignore file into an `ignore` matcher.
 *
 * @param ignoreFilePath - Ignore file path.
 * @param useCache - Whether to cache matcher instances.
 * @returns Parsed matcher, or undefined when file does not exist.
 */
function loadIgnoreMatcher(
  ignoreFilePath: string,
  useCache: boolean,
): Promise<Ignore | undefined> {
  const loadTask = () =>
    readFile(ignoreFilePath, 'utf8')
      .then(content => {
        const ig = ignore()
        ig.add(content)
        return ig
      })
      .catch(error => {
        const code = (error as NodeJS.ErrnoException).code
        if (code === 'ENOENT' || code === 'ENOTDIR') {
          return undefined
        }

        throw error
      })

  if (!useCache) {
    return loadTask()
  }

  return cachePromise(ignoreMatcherCache, ignoreFilePath, loadTask)
}

/**
 * Match `ignorePatterns` from config with support for negated patterns.
 *
 * @param filepath - Absolute file path.
 * @param configDir - Resolved config directory.
 * @param patterns - Config ignore patterns.
 * @param useCache - Whether to reuse compiled pattern matchers.
 * @returns True when patterns mark the file as ignored.
 */
function matchConfigIgnorePatterns(
  filepath: string,
  configDir: string,
  patterns: string[],
  useCache: boolean,
) {
  validateConfigIgnorePatterns(patterns)

  const relativeFile = relativeSafe(configDir, filepath)
  if (isPathOutsideBase(relativeFile)) {
    return false
  }

  if (!useCache) {
    return ignore().add(patterns).ignores(relativeFile)
  }

  const cacheKey = `${configDir}::${JSON.stringify(patterns)}`
  const cachedMatcher = getCacheValue(configIgnoreMatcherCache, cacheKey)
  if (cachedMatcher) {
    return cachedMatcher.ignores(relativeFile)
  }

  const matcher = ignore().add(patterns)
  setCacheValue(configIgnoreMatcherCache, cacheKey, matcher)
  return matcher.ignores(relativeFile)
}

/**
 * Match file path against one ignore file.
 *
 * @param filepath - Absolute file path.
 * @param ignoreFilePath - Ignore file path.
 * @param useCache - Whether to use matcher cache.
 * @param baseDir - Base directory for relative path calculation, defaults to ignore file directory.
 * @returns True when ignored by this file.
 */
async function matchIgnoreFile(
  filepath: string,
  ignoreFilePath: string,
  useCache: boolean,
  baseDir?: string,
) {
  const matcher = await loadIgnoreMatcher(ignoreFilePath, useCache)
  if (!matcher) {
    return false
  }

  const relativeToIgnore = relativeSafe(
    baseDir ?? dirname(ignoreFilePath),
    filepath,
  )
  if (isPathOutsideBase(relativeToIgnore)) {
    return false
  }

  return matcher.ignores(relativeToIgnore)
}

/**
 * Match a file path against ordered ignore files while preserving negation state.
 *
 * @param filepath - Absolute file path.
 * @param ignoreFileEntries - Ignore files in increasing precedence order.
 * @param useCache - Whether to use matcher cache.
 * @param stopAtIgnoredDirectory - Whether ignored directories prevent reading nested ignore files.
 * @returns True when the ordered ignore files mark the file as ignored.
 */
async function matchIgnoreFileChain(
  filepath: string,
  ignoreFileEntries: IgnoreFileEntry[],
  useCache: boolean,
  stopAtIgnoredDirectory = false,
): Promise<IgnoreFileChainResult> {
  const matcherEntries: LoadedIgnoreMatcher[] = []

  for (const entry of ignoreFileEntries) {
    const baseDir = entry.baseDir ?? dirname(entry.path)
    if (
      stopAtIgnoredDirectory &&
      matchLoadedIgnoreMatchers(baseDir, matcherEntries, true).ignored
    ) {
      break
    }

    const matcher = await loadIgnoreMatcher(entry.path, useCache)
    if (matcher) {
      matcherEntries.push({ baseDir, matcher })
    }
  }

  return matchLoadedIgnoreMatchers(filepath, matcherEntries)
}

/**
 * Match a path against loaded ignore matchers in precedence order.
 *
 * @param filepath - Absolute file or directory path to test.
 * @param matcherEntries - Loaded matchers in increasing precedence order.
 * @param isDirectory - Whether the target path is a directory.
 * @returns Final ignore state after all matching rules.
 */
function matchLoadedIgnoreMatchers(
  filepath: string,
  matcherEntries: LoadedIgnoreMatcher[],
  isDirectory = false,
): IgnoreFileChainResult {
  let ignored = false
  let matched = false

  for (const entry of matcherEntries) {
    let relativeToIgnore = relativeSafe(entry.baseDir, filepath)
    if (isPathOutsideBase(relativeToIgnore)) {
      continue
    }

    if (isDirectory && relativeToIgnore && !relativeToIgnore.endsWith('/')) {
      relativeToIgnore += '/'
    }

    const result = entry.matcher.test(relativeToIgnore)
    if (result.ignored) {
      ignored = true
      matched = true
    } else if (result.unignored) {
      ignored = false
      matched = true
    }
  }

  return { ignored, matched }
}

/**
 * Build a POSIX relative path.
 *
 * @param from - Base directory.
 * @param to - Target path.
 * @returns POSIX relative path.
 */
function relativeSafe(from: string, to: string) {
  return toPosixPath(relative(from, to))
}

/**
 * Resolve the git info exclude file from a repo root.
 *
 * Worktrees and submodules store `.git` as a file containing a `gitdir:` pointer.
 *
 * @param repoRoot - Git repository working tree root.
 * @returns Absolute path to the git info exclude file, or undefined when unavailable.
 */
async function resolveGitInfoExcludePath(repoRoot: string) {
  const gitEntryPath = join(repoRoot, '.git')

  try {
    const stats = await stat(gitEntryPath)
    if (stats.isDirectory()) {
      return join(gitEntryPath, 'info', 'exclude')
    }

    if (!stats.isFile()) {
      return undefined
    }

    const gitEntryContent = await readFile(gitEntryPath, 'utf8')
    const gitdirLine = gitEntryContent
      .split(/\r?\n/u)
      .find(line => line.startsWith('gitdir:'))
    const gitdir = gitdirLine?.slice('gitdir:'.length).trim()

    if (!gitdir) {
      return undefined
    }

    const resolvedGitDir = isAbsolute(gitdir)
      ? gitdir
      : resolve(repoRoot, gitdir)
    const commonDirPath = join(resolvedGitDir, 'commondir')

    try {
      const commonDirContent = await readFile(commonDirPath, 'utf8')
      const commonDir = commonDirContent.trim()
      if (commonDir) {
        const resolvedCommonDir = isAbsolute(commonDir)
          ? commonDir
          : resolve(resolvedGitDir, commonDir)
        return join(resolvedCommonDir, 'info', 'exclude')
      }
    } catch (error) {
      const code = (error as NodeJS.ErrnoException).code
      if (code !== 'ENOENT' && code !== 'ENOTDIR') {
        throw error
      }
    }

    return join(resolvedGitDir, 'info', 'exclude')
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code
    if (code === 'ENOENT' || code === 'ENOTDIR') {
      return undefined
    }

    throw error
  }
}

/**
 * Resolve an ignore file path against cwd when needed.
 *
 * @param path - Absolute or relative path.
 * @param cwd - Current working directory.
 * @returns Absolute ignore file path.
 */
function resolveIgnoreFilePath(path: string, cwd: string) {
  return isAbsolute(path) ? path : resolve(cwd, path)
}

/**
 * Validate config ignore patterns using oxfmt's path constraints.
 *
 * @param patterns - Config ignore patterns.
 * @throws When a pattern contains a parent-directory path segment.
 */
function validateConfigIgnorePatterns(patterns: string[]) {
  for (const pattern of patterns) {
    const pathPart = pattern.startsWith('!') ? pattern.slice(1) : pattern
    const normalizedPathPart = pathPart.endsWith(String.raw`\ `)
      ? pathPart
      : pathPart.trimEnd()

    if (normalizedPathPart.split('/').includes('..')) {
      throw new Error(
        `Invalid pattern \`${pattern}\` in \`ignorePatterns\`: \`..\` is not supported, patterns are resolved within the config file's directory`,
      )
    }
  }
}
