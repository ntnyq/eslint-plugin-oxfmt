// @ts-check

import { expect, it } from 'vitest'
import { shouldIgnoreFile } from '../workers/matchers.mjs'

it.each([
  '..',
  '../sibling/a.js',
  String.raw`..\sibling\a.js`,
  '/other/a.js',
  'D:/other/a.js',
  String.raw`D:\other\a.js`,
  String.raw`\\server\share\a.js`,
])(
  'does not apply inline ignore patterns outside the base: %s',
  relativePath => {
    expect(shouldIgnoreFile(relativePath, ['**/*.js'])).toBe(false)
  },
)

it('retains matching and ordered negation within the base', () => {
  const patterns = ['generated/*', '!generated/keep.js']
  expect(shouldIgnoreFile('generated/a.js', patterns)).toBe(true)
  expect(shouldIgnoreFile('generated/keep.js', patterns)).toBe(false)
  expect(shouldIgnoreFile('..file.js', ['*.js'])).toBe(true)
})
