import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

/**
 * Run an integration scenario in an isolated project and always remove it.
 */
export async function withTempProject<Output>(
  run: (cwd: string) => Promise<Output>,
): Promise<Output> {
  const cwd = await mkdtemp(join(tmpdir(), 'oxfmt-project-'))
  try {
    return await run(cwd)
  } finally {
    await rm(cwd, { force: true, recursive: true })
  }
}
