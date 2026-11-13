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
 * Build a cache key for config content; prefixes missing entries.
 *
 * @deprecated Internal cache key format; retained for compatibility.
 *
 * @param resolvedPath - Resolved oxfmt config path.
 * @param editorconfigPath - Resolved editorconfig path.
 * @param resolveKey - Resolution cache key.
 * @returns Cache key for config content cache.
 */
export function getConfigCacheKey(
  resolvedPath: string | undefined,
  editorconfigPath: string | undefined,
  resolveKey: string,
): string {
  return JSON.stringify([
    resolvedPath ?? null,
    editorconfigPath ?? null,
    resolveKey,
  ])
}

/**
 * Build a cache key for path resolution (cwd + configPath).
 *
 * @deprecated Internal cache key format; retained for compatibility.
 *
 * @param cwd - Current working directory.
 * @param configPath - Optional config path.
 * @returns Cache key for resolve cache.
 */
export function getResolveCacheKey(cwd: string, configPath?: string): string {
  return JSON.stringify([cwd, configPath ?? null])
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
