import { mkdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { expect, it } from 'vitest'
import { loadOxfmtConfig, loadOxfmtConfigForFile } from '../src'
import { withTempDir } from './helpers'

it('resolves ancestor EditorConfig sections without changing explicit override paths', async () => {
  await withTempDir('oxfmt-file-config-', async cwd => {
    const packageDir = join(cwd, 'packages/app')
    await mkdir(packageDir, { recursive: true })
    const overrides = [{ files: ['src/*.js'], options: { semi: false } }]
    await writeFile(
      join(packageDir, '.oxfmtrc.json'),
      JSON.stringify({ overrides }),
    )
    await writeFile(join(cwd, '.editorconfig'), '[*.js]\nquote_type = single\n')

    const result = await loadOxfmtConfigForFile({
      cwd,
      filepath: 'packages/app/src/a.js',
    })

    expect(result).toEqual({
      config: { overrides, singleQuote: true },
      dirname: packageDir,
      filepath: join(packageDir, '.oxfmtrc.json'),
    })
  })
})

it('isolates cached per-file fallbacks from sibling files and static results', async () => {
  await withTempDir('oxfmt-file-config-cache-', async cwd => {
    await writeFile(join(cwd, '.oxfmtrc.json'), '{}')
    await writeFile(
      join(cwd, '.editorconfig'),
      '[*.js]\nquote_type = single\n[*.ts]\nquote_type = double\n',
    )
    const staticResult = await loadOxfmtConfig({ cwd })
    const javascript = await loadOxfmtConfigForFile({
      cwd,
      filepath: 'src/a.js',
    })
    const typescript = await loadOxfmtConfigForFile({
      cwd,
      filepath: 'src/a.ts',
    })

    expect(javascript.config).toEqual({ singleQuote: true })
    expect(typescript.config).toEqual({ singleQuote: false })
    expect(
      (await loadOxfmtConfigForFile({ cwd, filepath: 'src/a.js' })).config,
    ).toBe(javascript.config)
    expect((await loadOxfmtConfig({ cwd })).config).toBe(staticResult.config)
    expect(staticResult.config.overrides).toHaveLength(2)

    await writeFile(join(cwd, '.editorconfig'), '[*]\nquote_type = double\n')
    await writeFile(join(cwd, '.oxfmtrc.json'), '{"semi":false}')
    expect(
      (await loadOxfmtConfigForFile({ cwd, filepath: 'src/a.js' })).config,
    ).toBe(javascript.config)
    expect(
      (
        await loadOxfmtConfigForFile({
          cwd,
          filepath: 'src/a.js',
          useCache: false,
        })
      ).config,
    ).toEqual({ semi: false, singleQuote: false })
  })
})

it('resolves EditorConfig without an oxfmt config or matching working directory', async () => {
  await withTempDir('oxfmt-editorconfig-only-', async cwd => {
    const child = join(cwd, 'src')
    await mkdir(child)
    await writeFile(
      join(cwd, '.editorconfig'),
      '[src/*.js]\nquote_type = single\n',
    )

    const result = await loadOxfmtConfigForFile({
      cwd: child,
      filepath: 'a.js',
    })
    expect(result).toEqual({ config: { singleQuote: true } })
    expect(
      (
        await loadOxfmtConfigForFile({
          cwd: child,
          editorconfig: false,
          filepath: 'a.js',
        })
      ).config,
    ).toEqual({})
  })
})

it('does not apply scoped or global EditorConfig settings outside their directory', async () => {
  await withTempDir('oxfmt-editorconfig-scope-', async cwd => {
    const editorDir = join(cwd, 'other')
    await mkdir(editorDir)
    await writeFile(join(cwd, '.oxfmtrc.json'), '{}')
    await writeFile(
      join(editorDir, '.editorconfig'),
      '[*]\nquote_type = single\n[*.js]\nmax_line_length = 40\n',
    )

    const result = await loadOxfmtConfigForFile({
      cwd,
      editorconfig: { cwd: editorDir },
      filepath: 'src/a.js',
    })
    expect(result.config).toEqual({})
  })
})
