// @ts-check

import ignore from 'ignore'
import picomatch from 'picomatch'

/**
 * Maximum number of compiled matchers retained in each worker cache.
 * @type {number}
 */
const MAX_CACHE_SIZE = 200

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
 * Get or create a cached picomatch matcher for oxfmt override globs.
 * @param {string[]} patterns - Glob patterns.
 * @returns {import('picomatch').Matcher} Compiled matcher.
 * @throws {Error} If a pattern contains invalid glob syntax.
 */
export function getCachedOverrideMatcher(patterns) {
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
 * Check if a file should be ignored by provided gitignore-style patterns.
 * @param {string} relativePath - Relative path against pattern base.
 * @param {string[] | undefined} ignorePatterns - Ordered gitignore-style patterns.
 * @returns {boolean} Whether file is ignored.
 */
export function shouldIgnoreFile(relativePath, ignorePatterns) {
  if (!ignorePatterns?.length) {
    return false
  }

  const matcher = getCachedIgnoreMatcher(ignorePatterns)
  return matcher.ignores(relativePath)
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
