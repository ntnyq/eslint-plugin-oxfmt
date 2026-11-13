import { writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { expect, it } from 'vitest'
import { isOxfmtIgnored } from '../src'
import { withTempDir } from './helpers'

it('reuses preloaded config and its matching base without rereading disk', async () => {
  await withTempDir('oxfmt-preloaded-ignore-', async cwd => {
    await writeFile(join(cwd, '.oxfmtrc.json'), '{invalid')
    const loadedConfig = {
      config: { ignorePatterns: ['generated/**'] },
      dirname: join(cwd, 'package'),
    }
    const options = {
      cwd,
      includeDefaultIgnores: false,
      loadedConfig,
      useCache: false,
    }
    expect(
      await isOxfmtIgnored({ ...options, filepath: 'package/generated/a.js' }),
    ).toEqual({ ignored: true, reason: 'config-ignore-patterns' })
    expect(
      await isOxfmtIgnored({ ...options, filepath: 'generated/a.js' }),
    ).toEqual({ ignored: false })
    expect(
      await isOxfmtIgnored({
        ...options,
        filepath: 'package/generated/a.js',
        loadConfigForIgnorePatterns: false,
      }),
    ).toEqual({ ignored: false })
    expect(
      await isOxfmtIgnored({
        ...options,
        filepath: 'package/generated/a.js',
        includeConfigIgnorePatterns: false,
      }),
    ).toEqual({ ignored: false })
  })
})

it('keeps global ignores ahead of preloaded config pattern validation', async () => {
  await withTempDir('oxfmt-preloaded-global-', async cwd => {
    await writeFile(join(cwd, '.prettierignore'), 'generated/')
    expect(
      await isOxfmtIgnored({
        cwd,
        filepath: 'generated/a.js',
        loadedConfig: {
          config: { ignorePatterns: ['../invalid'] },
          dirname: cwd,
        },
      }),
    ).toEqual({ ignored: true, reason: 'prettierignore' })
  })
})
