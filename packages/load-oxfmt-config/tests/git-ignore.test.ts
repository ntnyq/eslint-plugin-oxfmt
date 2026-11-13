import { mkdir, stat, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { afterEach, expect, it, vi } from 'vitest'
import { isOxfmtIgnored } from '../src'
import {
  collectGitignorePaths,
  resolveGitInfoExcludePath,
} from '../src/git-ignore'
import { withTempDir } from './helpers'

vi.mock('node:fs/promises', async importOriginal => {
  const fs = await importOriginal<typeof import('node:fs/promises')>()
  return {
    ...fs,
    stat: vi.fn(fs.stat),
  }
})

afterEach(() => vi.clearAllMocks())

it('reuses Git discovery and info exclude paths for sibling files', async () => {
  await withTempDir('oxfmt-git-discovery-', async cwd => {
    await mkdir(join(cwd, '.git'))
    await mkdir(join(cwd, 'src/a/b'), { recursive: true })
    const options = { cwd, loadConfigForIgnorePatterns: false }
    await isOxfmtIgnored({ ...options, filepath: 'src/a/b/first.js' })
    const initialCalls = vi.mocked(stat).mock.calls.length
    expect(initialCalls).toBeGreaterThan(0)
    await isOxfmtIgnored({ ...options, filepath: 'src/a/b/second.js' })
    expect(vi.mocked(stat).mock.calls).toHaveLength(initialCalls)
  })
})

it('bypasses cached Git boundaries and worktree common directories', async () => {
  await withTempDir('oxfmt-git-bypass-', async cwd => {
    await mkdir(join(cwd, '.git'))
    const child = join(cwd, 'nested')
    await mkdir(child)
    const file = join(child, 'a.js')
    expect((await collectGitignorePaths(file, true)).repoRoot).toBe(cwd)

    await mkdir(join(child, 'gitdir'))
    await writeFile(join(child, '.git'), 'gitdir: gitdir\n')
    await writeFile(join(child, 'gitdir/commondir'), '../common-one\n')
    expect((await collectGitignorePaths(file, false)).repoRoot).toBe(child)
    expect(await resolveGitInfoExcludePath(child, true)).toBe(
      join(child, 'common-one/info/exclude'),
    )
    await writeFile(join(child, 'gitdir/commondir'), '../common-two\n')
    expect(await resolveGitInfoExcludePath(child, false)).toBe(
      join(child, 'common-two/info/exclude'),
    )
  })
})

it('retries discovery after a filesystem error instead of caching its rejection', async () => {
  await withTempDir('oxfmt-git-retry-', async cwd => {
    await mkdir(join(cwd, '.git'))
    const error = new Error('Git discovery failed')
    vi.mocked(stat).mockRejectedValueOnce(error)
    const file = join(cwd, 'a.js')
    await expect(collectGitignorePaths(file, true)).rejects.toBe(error)
    expect((await collectGitignorePaths(file, true)).repoRoot).toBe(cwd)
  })
})
