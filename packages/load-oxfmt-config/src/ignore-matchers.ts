import { readFile } from 'node:fs/promises'
import { dirname } from 'node:path'
import ignore from 'ignore'
import { cachePromise, getCacheValue, setCacheValue } from './cache'
import { isPathOutsideBase, toRelativePosixPath } from './path'
import type { Ignore } from 'ignore'

/**
 * Cache parsed ignore files, including missing files, by absolute path.
 */
const ignoreMatcherCache = new Map<string, Promise<Ignore | undefined>>()

/**
 * Cache compiled config patterns independently of ignore file discovery.
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
 * Match `ignorePatterns` from config with support for negated patterns.
 *
 * @param filepath - Absolute file path.
 * @param configDir - Resolved config directory.
 * @param patterns - Config ignore patterns.
 * @param useCache - Whether to reuse compiled pattern matchers.
 * @returns True when patterns mark the file as ignored.
 */
export function matchConfigIgnorePatterns(
  filepath: string,
  configDir: string,
  patterns: string[],
  useCache: boolean,
) {
  validateConfigIgnorePatterns(patterns)

  const relativeFile = toRelativePosixPath(configDir, filepath)
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
export async function matchIgnoreFile(
  filepath: string,
  ignoreFilePath: string,
  useCache: boolean,
  baseDir?: string,
) {
  const matcher = await loadIgnoreMatcher(ignoreFilePath, useCache)
  if (!matcher) {
    return false
  }

  const relativeToIgnore = toRelativePosixPath(
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
export async function matchIgnoreFileChain(
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
        const matcher = ignore()
        matcher.add(content)
        return matcher
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
    let relativeToIgnore = toRelativePosixPath(entry.baseDir, filepath)
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

  return {
    ignored,
    matched,
  }
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
