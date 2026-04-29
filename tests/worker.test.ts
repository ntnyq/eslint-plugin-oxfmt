import { join } from 'node:path'
import process from 'node:process'
import { createSyncFn } from 'synckit'
import { expect, it } from 'vitest'
import { dirWorkers } from '../src/dir'
import type { Options as LoadOxfmtConfigOptions } from 'load-oxfmt-config'
import type { format, FormatConfig } from 'oxfmt'

type FormatResult = Awaited<ReturnType<typeof format>>
type WorkerOptions = FormatConfig & LoadOxfmtConfigOptions

const runWorker = createSyncFn(join(dirWorkers, 'oxfmt.mjs')) as unknown as (
  filename: string,
  sourceText: string,
  options?: WorkerOptions,
) => FormatResult

it('should require an options object when invoking the worker directly', () => {
  expect(() => runWorker('test.js', 'const value = 1;', undefined)).toThrow(
    'oxfmt worker expected an options object.',
  )
})

it('should require cwd when invoking the worker directly', () => {
  expect(() =>
    runWorker('test.js', 'const value = 1;', {
      useConfig: false,
    } as WorkerOptions),
  ).toThrow('oxfmt worker requires a non-empty "cwd" option.')
})

it('should require configPath to be a string when provided', () => {
  expect(() =>
    runWorker('test.js', 'const value = 1;', {
      configPath: 123,
      cwd: process.cwd(),
      useConfig: true,
    } as unknown as WorkerOptions),
  ).toThrow('oxfmt worker requires "configPath" to be a string when provided.')
})

it('should require ignorePatterns to be a string array when provided', () => {
  expect(() =>
    runWorker('test.js', 'const value = 1;', {
      cwd: process.cwd(),
      ignorePatterns: ['ok', 123],
      useConfig: false,
    } as unknown as WorkerOptions),
  ).toThrow(
    'oxfmt worker requires "ignorePatterns" to be an array of strings when provided.',
  )
})

it('should require overrides to be an array when provided', () => {
  expect(() =>
    runWorker('test.js', 'const value = 1;', {
      cwd: process.cwd(),
      overrides: 'bad-overrides',
      useConfig: false,
    } as unknown as WorkerOptions),
  ).toThrow('oxfmt worker requires "overrides" to be an array when provided.')
})

it('should require useConfig to be a boolean when provided', () => {
  expect(() =>
    runWorker('test.js', 'const value = 1;', {
      cwd: process.cwd(),
      useConfig: 'true',
    } as unknown as WorkerOptions),
  ).toThrow('oxfmt worker requires "useConfig" to be a boolean when provided.')
})
