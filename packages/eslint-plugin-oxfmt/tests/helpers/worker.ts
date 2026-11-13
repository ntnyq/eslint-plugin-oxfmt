import { join } from 'node:path'
import { createSyncFn } from 'synckit'
import { workersDir } from '../../src/worker-path'
import type { OxfmtWorkerOptions, WorkerFormatResult } from '../../src/types'

/**
 * Invoke the same synchronous worker boundary used by the ESLint rule.
 */
export const runWorker = createSyncFn<
  (
    filename: string,
    sourceText: string,
    options?: OxfmtWorkerOptions,
  ) => WorkerFormatResult
>(join(workersDir, 'oxfmt.mjs'))
