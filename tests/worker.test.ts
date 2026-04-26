import { join } from 'node:path'
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
