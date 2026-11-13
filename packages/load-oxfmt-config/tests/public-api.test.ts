import * as published from 'load-oxfmt-config'
import { expect, expectTypeOf, it } from 'vitest'
import * as source from '../src'
import type { EditorconfigLoadOptions, EditorconfigOption } from '../src'

it('retains historical exports without exposing new implementation helpers', () => {
  const names = [
    'getConfigCacheKey',
    'getResolveCacheKey',
    'isOxfmtIgnored',
    'loadOxfmtConfig',
    'loadOxfmtConfigForFile',
    'readConfigFromFile',
    'resolveOxfmtrcPath',
  ]
  expect(Object.keys(source).sort()).toEqual(names.sort())
  expect(Object.keys(published).sort()).toEqual(names.sort())
  expect(published.getResolveCacheKey('/project', 'config.json')).toBe(
    source.getResolveCacheKey('/project', 'config.json'),
  )
  expectTypeOf<EditorconfigLoadOptions>().toEqualTypeOf<EditorconfigOption>()
  expectTypeOf<published.EditorconfigLoadOptions>().toEqualTypeOf<EditorconfigOption>()
})
