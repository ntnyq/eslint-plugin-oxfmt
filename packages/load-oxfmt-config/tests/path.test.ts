import { describe, expect, it } from 'vitest'
import { isPathOutsideBase } from '../src/path'

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
