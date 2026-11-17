// @ts-check

import ignore from 'ignore'
import picomatch from 'picomatch'
import { isPathOutsideBase } from './paths.mjs'

/**
 * Maximum number of compiled matchers retained in each worker cache.
 * @type {number}
 */
const MAX_CACHE_SIZE = 200

/**
 * Compiled oxfmt globs keyed by their ordered pattern list.
 * @type {Map<string, import('picomatch').Matcher>}
 */
const globMatcherCache = new Map()

/**
 * Compiled gitignore-style rules keyed by their ordered pattern list.
 * @type {Map<string, import('ignore').Ignore>}
 */
const ignoreMatcherCache = new Map()

/**
 * Get or create a cached picomatch matcher for oxfmt overrides and associations.
 * @param {string[]} patterns - Glob patterns.
 * @returns {import('picomatch').Matcher} Compiled matcher.
 * @throws {Error} If a pattern contains invalid glob syntax.
 */
export function getCachedOxfmtGlobMatcher(patterns) {
  const key = patterns.join('\0')
  const cached = globMatcherCache.get(key)

  if (cached) {
    return cached
  }

  /**
   * Match oxfmt's literal exclamation marks and negated character classes.
   * @type {import('picomatch').PicomatchOptions}
   */
  const matcherOptions = {
    dot: true,
    fastpaths: false,
    literalBrackets: false,
    noextglob: true,
    nonegate: true,
    posix: true,
    strictBrackets: true,
  }

  const normalizedPatterns = []

  for (const pattern of patterns) {
    try {
      const normalized = normalizeOxfmtGlob(pattern)

      picomatch(normalized, matcherOptions)
      normalizedPatterns.push(normalized)
    } catch (error) {
      const details = error instanceof Error ? `: ${error.message}` : ''

      throw new Error(`Invalid glob pattern \`${pattern}\`${details}`, {
        cause: error,
      })
    }
  }

  const matcher = picomatch(normalizedPatterns, matcherOptions)

  setCacheEntry(globMatcherCache, key, matcher)

  return matcher
}

/**
 * Check if a file should be ignored by provided gitignore-style patterns.
 * @param {string} relativePath - Relative path against pattern base.
 * @param {string[] | undefined} ignorePatterns - Ordered gitignore-style patterns.
 * @returns {boolean} Whether file is ignored.
 */
export function shouldIgnoreFile(relativePath, ignorePatterns) {
  if (!ignorePatterns?.length || isPathOutsideBase(relativePath)) {
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

  const matcher = ignore({ ignorecase: false }).add(patterns)

  setCacheEntry(ignoreMatcherCache, key, matcher)

  return matcher
}

/**
 * Normalize oxc_config's recursive basename globs and fast_glob brace syntax.
 * Braces enumerate alternatives, including a single literal `1..3` alternative;
 * parentheses and quotes have no special meaning in upstream globs.
 * @param {string} pattern - User-written glob.
 * @returns {string} Pattern using equivalent picomatch syntax.
 */
function normalizeOxfmtGlob(pattern) {
  const relativePattern = pattern.startsWith('./')
    ? pattern.slice(2)
    : pattern.includes('/')
      ? pattern
      : `**/${pattern}`
  /** @type {{prefix: string, hasComma: boolean}[]} */
  const braces = []
  let normalized = ''
  let inClass = false

  for (let index = 0; index < relativePattern.length; index++) {
    const character = relativePattern[index]

    if (character === '\\') {
      normalized += character + (relativePattern[++index] ?? '')
    } else if (character === '[' && !inClass) {
      inClass = true
      normalized += character
    } else if (character === ']' && inClass) {
      inClass = false
      normalized += character
    } else if (inClass) {
      normalized += character
    } else if (character === '{') {
      braces.push({ hasComma: false, prefix: normalized })
      normalized = ''
    } else if (character === '}') {
      const brace = braces.pop()

      if (!brace) {
        throw new SyntaxError('Missing opening: "{"')
      }

      normalized =
        brace.prefix + (brace.hasComma ? `{${normalized}}` : normalized)
    } else if (character === ',' && braces.length > 0) {
      braces[braces.length - 1].hasComma = true
      normalized += character
    } else if (character === '.' && braces.length > 0) {
      // Escaped dots still trigger picomatch's brace range optimization.
      normalized += '[.]'
    } else if ('()|"'.includes(character)) {
      normalized += `\\${character}`
    } else {
      normalized += character
    }
  }

  if (braces.length > 0) {
    throw new SyntaxError('Missing closing: "}"')
  }

  return normalized
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
