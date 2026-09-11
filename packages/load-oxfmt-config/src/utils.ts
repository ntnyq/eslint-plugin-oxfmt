import { CACHE_MAX_ENTRIES } from './constants'

/**
 * Return a cached promise by key, creating and storing it on miss.
 *
 * If the promise rejects, the cache entry is removed so future calls can retry.
 *
 * @param cache - Map used to store inflight/resolved promises.
 * @param key - Cache key.
 * @param factory - Factory to create the promise when missing.
 * @returns Cached or newly created promise.
 */
export function cachePromise<T>(
  cache: Map<string, Promise<T>>,
  key: string,
  factory: () => Promise<T>,
): Promise<T> {
  const cached = getCacheValue(cache, key)
  if (cached) {
    return cached
  }

  const task = factory().catch(error => {
    if (cache.get(key) === task) {
      cache.delete(key)
    }

    throw error
  })

  setCacheValue(cache, key, task)
  return task
}

/**
 * Read a cache value and move it to the most-recent position.
 *
 * @param cache - Cache map to read.
 * @param key - Cache key.
 * @returns Cached value, or undefined when missing.
 */
export function getCacheValue<CacheKey, CacheValue>(
  cache: Map<CacheKey, CacheValue>,
  key: CacheKey,
): CacheValue | undefined {
  const value = cache.get(key)
  if (value === undefined) {
    return undefined
  }

  cache.delete(key)
  cache.set(key, value)
  return value
}

/**
 * Check whether a relative path points outside its intended base directory.
 *
 * This also recognizes Windows drive-qualified paths when running on another
 * platform so the behavior can be tested consistently.
 *
 * @param path - Relative path candidate.
 * @returns True when the path escapes or is absolute.
 */
export function isPathOutsideBase(path: string): boolean {
  const normalizedPath = toPosixPath(path)
  return (
    normalizedPath === '..' ||
    normalizedPath.startsWith('../') ||
    normalizedPath.startsWith('/') ||
    /^[A-Za-z]:\//u.test(normalizedPath)
  )
}

/**
 * Store a cache value and evict the least-recent entry when over capacity.
 *
 * @param cache - Cache map to update.
 * @param key - Cache key.
 * @param value - Value to cache.
 */
export function setCacheValue<CacheKey, CacheValue>(
  cache: Map<CacheKey, CacheValue>,
  key: CacheKey,
  value: CacheValue,
) {
  cache.delete(key)
  cache.set(key, value)

  if (cache.size <= CACHE_MAX_ENTRIES) {
    return
  }

  const oldestKey = cache.keys().next()
  if (!oldestKey.done) {
    cache.delete(oldestKey.value)
  }
}

/**
 * Split a path into non-empty segments.
 *
 * @param path - Original path.
 * @returns Path segments.
 */
export function splitPathSegments(path: string): string[] {
  return path.split(/[\\/]+/u).filter(Boolean)
}

/**
 * Normalize a filesystem path to POSIX-style separators.
 *
 * @param path - Original path.
 * @returns Path using `/` as separator.
 */
export function toPosixPath(path: string): string {
  return path.replaceAll('\\', '/')
}
