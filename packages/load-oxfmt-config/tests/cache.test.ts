import { describe, expect, it } from 'vitest'
import {
  cachePromise,
  getCacheValue,
  getConfigCacheKey,
  getResolveCacheKey,
  setCacheValue,
} from '../src/cache'
import { CACHE_MAX_ENTRIES } from '../src/constants'

describe('cache helpers', () => {
  it('creates collision-safe resolve cache keys', () => {
    expect(getResolveCacheKey('/a::b', 'c')).not.toBe(
      getResolveCacheKey('/a', 'b::c'),
    )
  })

  it('creates collision-safe config cache keys', () => {
    expect(getConfigCacheKey('/a::b', 'c', 'resolve')).not.toBe(
      getConfigCacheKey('/a', 'b::c', 'resolve'),
    )
  })

  it('evicts the least-recently used entry at the cache limit', () => {
    const cache = new Map<number, number>()

    for (let index = 0; index < CACHE_MAX_ENTRIES; index++) {
      setCacheValue(cache, index, index)
    }

    expect(getCacheValue(cache, 0)).toBe(0)
    setCacheValue(cache, CACHE_MAX_ENTRIES, CACHE_MAX_ENTRIES)

    expect(cache).toHaveLength(CACHE_MAX_ENTRIES)
    expect(cache.has(0)).toBeTruthy()
    expect(cache.has(1)).toBeFalsy()
    expect(cache.has(CACHE_MAX_ENTRIES)).toBeTruthy()
  })

  it('bounds promise caches', () => {
    const cache = new Map<string, Promise<number>>()

    for (let index = 0; index <= CACHE_MAX_ENTRIES; index++) {
      cachePromise(cache, String(index), () => Promise.resolve(index))
    }

    expect(cache).toHaveLength(CACHE_MAX_ENTRIES)
    expect(cache.has('0')).toBeFalsy()
    expect(cache.has(String(CACHE_MAX_ENTRIES))).toBeTruthy()
  })
})
