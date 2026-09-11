import { describe, expect, it } from 'vitest'
import { CACHE_MAX_ENTRIES } from '../src/constants'
import {
  cachePromise,
  getCacheValue,
  isPathOutsideBase,
  setCacheValue,
} from '../src/utils'

describe('cache helpers', () => {
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

describe('isPathOutsideBase', () => {
  it.each([
    '..',
    '../file.ts',
    '/absolute/file.ts',
    'D:/absolute/file.ts',
    String.raw`D:\absolute\file.ts`,
    String.raw`\\server\share\file.ts`,
  ])('recognizes outside path %s', path => {
    expect(isPathOutsideBase(path)).toBeTruthy()
  })

  it.each(['file.ts', 'src/file.ts', '..file.ts', 'src/../file.ts'])(
    'keeps path %s within the base',
    path => {
      expect(isPathOutsideBase(path)).toBeFalsy()
    },
  )
})
