import { readFile } from 'node:fs/promises'
import ignore from 'ignore'
import { cachePromise, getCacheValue, setCacheValue } from './cache'
import { isPathOutsideBase, toRelativePosixPath } from './path'
import type { Ignore } from 'ignore'

/**
 * Cache compiled groups of ignore files that share a matching base.
 */
const ignoreMatcherCache = new Map<string, Promise<Ignore | undefined>>()

/**
 * Cache compiled config patterns independently of ignore file discovery.
 */
const configIgnoreMatcherCache = new Map<string, Ignore>()

interface IgnoreFileEntry {
  baseDir: string
  paths: string[]
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
  patterns: unknown,
  useCache: boolean,
) {
  if (patterns == null) {
    return false
  }

  validateConfigIgnorePatterns(patterns)

  if (patterns.length === 0) {
    return false
  }

  const relativeFile = toRelativePosixPath(configDir, filepath)

  if (isPathOutsideBase(relativeFile)) {
    return false
  }

  if (!useCache) {
    return ignore({ ignorecase: false }).add(patterns).ignores(relativeFile)
  }

  const cacheKey = `${configDir}::${JSON.stringify(patterns)}`
  const cachedMatcher = getCacheValue(configIgnoreMatcherCache, cacheKey)

  if (cachedMatcher) {
    return cachedMatcher.ignores(relativeFile)
  }

  const matcher = ignore({ ignorecase: false }).add(patterns)

  setCacheValue(configIgnoreMatcherCache, cacheKey, matcher)

  return matcher.ignores(relativeFile)
}

/**
 * Return the ignore file that excludes the target, if any.
 * Each entry combines same-base rules in increasing precedence order.
 */
export async function matchIgnoreFileChain(
  filepath: string,
  ignoreFileEntries: IgnoreFileEntry[],
  useCache: boolean,
  { required = false, stopAtIgnoredDirectory = false } = {},
): Promise<string | undefined> {
  const matcherEntries: LoadedIgnoreMatcher[] = []

  for (const { baseDir, paths } of ignoreFileEntries) {
    if (
      stopAtIgnoredDirectory &&
      matchLoadedIgnoreMatchers(baseDir, matcherEntries, true)
    ) {
      break
    }

    const matcher = await loadIgnoreMatcher(paths, useCache, required)

    if (matcher) {
      matcherEntries.push({ baseDir, matcher })
    }
  }

  return matchLoadedIgnoreMatchers(filepath, matcherEntries)
}

/**
 * Source marks preserve the reason when matching a combined set of rules.
 */
function loadIgnoreMatcher(
  paths: string[],
  useCache: boolean,
  required: boolean,
): Promise<Ignore | undefined> {
  const loadTask = async () => {
    let matcher: Ignore | undefined

    for (const path of paths) {
      try {
        const content = await readFile(path, 'utf8')

        matcher ??= ignore({ ignorecase: false })
        // The matcher strips one trailing CR from each marked pattern.
        matcher.add(
          content.split('\n').map(pattern => ({
            mark: path,
            pattern,
          })),
        )
      } catch (error) {
        const code = (error as NodeJS.ErrnoException).code

        if (required || (code !== 'ENOENT' && code !== 'ENOTDIR')) {
          throw error
        }
      }
    }

    return matcher
  }

  return useCache
    ? cachePromise(
        ignoreMatcherCache,
        JSON.stringify([paths, required]),
        loadTask,
      )
    : loadTask()
}

/**
 * Match a path against loaded ignore matchers in precedence order.
 *
 * @param filepath - Absolute file or directory path to test.
 * @param matcherEntries - Loaded matchers in increasing precedence order.
 * @param isDirectory - Whether the target path is a directory.
 * @returns Source of the winning exclusion.
 */
function matchLoadedIgnoreMatchers(
  filepath: string,
  matcherEntries: LoadedIgnoreMatcher[],
  isDirectory = false,
): string | undefined {
  let ignoredBy: string | undefined

  for (const entry of matcherEntries) {
    let relativeToIgnore = toRelativePosixPath(entry.baseDir, filepath)

    if (!relativeToIgnore || isPathOutsideBase(relativeToIgnore)) {
      continue
    }

    if (isDirectory) {
      relativeToIgnore += '/'
    }

    const result = entry.matcher.test(relativeToIgnore)

    if (result.ignored) {
      ignoredBy = result.rule?.mark
    } else if (result.unignored) {
      ignoredBy = undefined
    }
  }

  return ignoredBy
}

/**
 * Validate config ignore patterns using oxfmt's path constraints.
 *
 * @param patterns - Config ignore patterns.
 * @throws When a pattern contains a parent-directory path segment.
 */
function validateConfigIgnorePatterns(
  patterns: unknown,
): asserts patterns is string[] {
  const typeError = 'Invalid ignorePatterns: expected an array of strings.'

  if (!Array.isArray(patterns)) {
    throw new TypeError(typeError)
  }

  for (const pattern of patterns) {
    if (typeof pattern !== 'string') {
      throw new TypeError(typeError)
    }

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
