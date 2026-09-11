import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const FIXTURES_DIR = join(import.meta.dirname, 'fixtures')

export function fixturePath(...segments: string[]): string {
  return join(FIXTURES_DIR, ...segments)
}

export async function withTempDir<T>(
  prefix: string,
  run: (cwd: string) => Promise<T>,
): Promise<T> {
  const cwd = await mkdtemp(join(tmpdir(), prefix))

  try {
    return await run(cwd)
  } finally {
    await rm(cwd, { force: true, recursive: true })
  }
}
