import { join } from 'node:path'
import process from 'node:process'
import { createSyncFn } from 'synckit'
import { expect, it } from 'vitest'
import { workersDir } from '../src/worker-path'
import { resolvePackagePath } from './helpers/paths'
import type { OxfmtWorkerOptions, WorkerFormatResult } from '../src/types'

const runWorker = createSyncFn<
  (
    filename: string,
    sourceText: string,
    options?: OxfmtWorkerOptions,
  ) => WorkerFormatResult
>(join(workersDir, 'oxfmt.mjs'))

it('should allow invoking the worker without an options object', () => {
  const filename = resolvePackagePath(
    'tests/fixtures/config-loading/json/src/example.js',
  )
  const result = runWorker(filename, `export const value = "hello"\n`)
  expect(result).toBeTypeOf('object')
})

it('should require cwd to be a string when provided', () => {
  expect(() =>
    runWorker('test.js', 'const value = 1;', {
      cwd: 123,
    } as unknown as OxfmtWorkerOptions),
  ).toThrow('oxfmt worker requires "cwd" to be a string when provided.')
})

it('should require configPath to be a string when provided', () => {
  expect(() =>
    runWorker('test.js', 'const value = 1;', {
      configPath: 123,
      cwd: process.cwd(),
      useConfig: true,
    } as unknown as OxfmtWorkerOptions),
  ).toThrow('oxfmt worker requires "configPath" to be a string when provided.')
})

it('should require ignorePath to be a string or string array when provided', () => {
  expect(() =>
    runWorker('test.js', 'const value = 1;', {
      cwd: process.cwd(),
      ignorePath: ['ok', 123],
      useConfig: false,
    } as unknown as OxfmtWorkerOptions),
  ).toThrow(
    'oxfmt worker requires "ignorePath" to be a string or string array when provided.',
  )
})

it('should require withNodeModules to be a boolean when provided', () => {
  expect(() =>
    runWorker('test.js', 'const value = 1;', {
      cwd: process.cwd(),
      withNodeModules: 'true',
    } as unknown as OxfmtWorkerOptions),
  ).toThrow(
    'oxfmt worker requires "withNodeModules" to be a boolean when provided.',
  )
})

it('should require disableNestedConfig to be a boolean when provided', () => {
  expect(() =>
    runWorker('test.js', 'const value = 1;', {
      cwd: process.cwd(),
      disableNestedConfig: 'true',
    } as unknown as OxfmtWorkerOptions),
  ).toThrow(
    'oxfmt worker requires "disableNestedConfig" to be a boolean when provided.',
  )
})

it('should require respectOxfmtDefaultIgnores to be a boolean when provided', () => {
  expect(() =>
    runWorker('test.js', 'const value = 1;', {
      cwd: process.cwd(),
      respectOxfmtDefaultIgnores: 'true',
    } as unknown as OxfmtWorkerOptions),
  ).toThrow(
    'oxfmt worker requires "respectOxfmtDefaultIgnores" to be a boolean when provided.',
  )
})

it('should require useConfig to be a boolean when provided', () => {
  expect(() =>
    runWorker('test.js', 'const value = 1;', {
      cwd: process.cwd(),
      useConfig: 'true',
    } as unknown as OxfmtWorkerOptions),
  ).toThrow('oxfmt worker requires "useConfig" to be a boolean when provided.')
})
