import { join, relative, resolve } from 'node:path'
import process from 'node:process'
import { describe, expect, it } from 'vitest'
import { resolveOxfmtrcPath } from '../src'
import { fixturePath } from './helpers'

describe('resolveOxfmtrcPath', () => {
  it('uses explicit configPath relative to cwd', async () => {
    const cwd = fixturePath('resolve', 'explicit-relative')
    const configPath = '.oxfmtrc.json'
    const expectedPath = join(cwd, configPath)

    const resolved = await resolveOxfmtrcPath(cwd, configPath)

    expect(resolved).toBe(expectedPath)
  })

  it('walks up directories to find config files', async () => {
    const root = fixturePath('resolve', 'walk-up')
    const parent = join(root, 'parent')
    const child = join(parent, 'child')
    const configPath = join(parent, '.oxfmtrc.json')

    const resolved = await resolveOxfmtrcPath(child)

    expect(resolved).toBe(configPath)
  })

  it('resolves nearest fixture config from nested directory', async () => {
    const nested = fixturePath('resolve', 'no-config', 'nested')
    const expected = fixturePath('resolve', 'no-config', '.oxfmtrc.json')

    const resolved = await resolveOxfmtrcPath(nested)

    expect(resolved).toBe(expected)
  })

  it('returns absolute configPath unchanged', async () => {
    const cwd = fixturePath('resolve', 'absolute')
    const absoluteConfig = join(cwd, '.oxfmtrc.json')

    const resolved = await resolveOxfmtrcPath(cwd, absoluteConfig)

    expect(resolved).toBe(absoluteConfig)
  })

  it('returns absolute paths even when cwd is relative', async () => {
    const absoluteCwd = fixturePath('resolve', 'explicit-relative')
    const relativeCwd = relative(process.cwd(), absoluteCwd)

    const resolvedPath = await resolveOxfmtrcPath(relativeCwd, '.oxfmtrc.json')

    expect(resolvedPath).toBe(resolve(absoluteCwd, '.oxfmtrc.json'))
  })
})
