import { mkdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { loadOxfmtConfig } from '../src'
import { fixturePath, withTempDir } from './helpers'

describe('loadOxfmtConfig', () => {
  describe('basic loading', () => {
    it.each(['.oxfmtrc.json', '.oxfmtrc.jsonc', 'custom-config'])(
      'loads a BOM-prefixed %s config',
      async filename => {
        await withTempDir('oxfmt-config-bom-', async cwd => {
          const content = filename.endsWith('.jsonc')
            ? '// Formatting options\n{"singleQuote": true,}'
            : '{"singleQuote": true}'
          await writeFile(join(cwd, filename), `\u{FEFF}${content}`)

          const result = await loadOxfmtConfig({
            configPath: filename === 'custom-config' ? filename : undefined,
            cwd,
            editorconfig: false,
          })

          expect(result.config).toStrictEqual({ singleQuote: true })
          expect(result.filepath).toBe(join(cwd, filename))
        })
      },
    )

    it('preserves associations and Astro options for formatter consumers', async () => {
      await withTempDir('oxfmt-config-associations-', async cwd => {
        const config = {
          associations: [{ files: ['src/*.conf'], language: 'json' }],
          astro: { skipFrontmatter: true },
        }
        await writeFile(join(cwd, '.oxfmtrc.json'), JSON.stringify(config))
        const result = await loadOxfmtConfig({ cwd, editorconfig: false })
        expect(result.config).toStrictEqual(config)
        expect(result.dirname).toBe(cwd)
      })
    })

    it('returns empty object when config is missing', async () => {
      const cwd = fixturePath('load', 'missing')

      const result = await loadOxfmtConfig({ cwd })

      expect(result.config).toStrictEqual({})
    })

    it('loads JSON config when configPath is provided', async () => {
      const cwd = fixturePath('load', 'json')
      const configPath = '.oxfmtrc.json'

      const result = await loadOxfmtConfig({ configPath, cwd })

      expect(result.config).toStrictEqual({ printWidth: 80, semi: false })
    })

    it('parses JSONC config files', async () => {
      const cwd = fixturePath('load', 'jsonc')
      const configPath = '.oxfmtrc.jsonc'

      const result = await loadOxfmtConfig({ configPath, cwd })

      expect(result.config).toStrictEqual({ singleQuote: true, tabWidth: 4 })
    })

    it('throws a helpful error when JSON is invalid', async () => {
      const cwd = fixturePath('load', 'invalid-json')
      const configPath = '.oxfmtrc.json'

      await expect(loadOxfmtConfig({ configPath, cwd })).rejects.toThrow(
        /Failed to parse oxfmt configuration file/u,
      )
    })

    it.each([
      ['JSON', 'custom.config.json', '[]'],
      ['JSONC', 'custom.config.jsonc', 'null'],
    ])(
      'throws when explicit %s config is not an object',
      async (_format, filename, content) => {
        await withTempDir('oxfmt-config-non-object-', async cwd => {
          const configPath = join(cwd, filename)
          await writeFile(configPath, content, 'utf8')

          await expect(
            loadOxfmtConfig({
              configPath,
              cwd,
              editorconfig: false,
              useCache: false,
            }),
          ).rejects.toThrow(/Configuration file must be an object/u)
        })
      },
    )

    it('loads config using absolute configPath', async () => {
      const cwd = fixturePath('load', 'absolute')
      const absoluteConfig = join(cwd, '.oxfmtrc.json')

      const result = await loadOxfmtConfig({ configPath: absoluteConfig, cwd })

      expect(result.config).toStrictEqual({ semi: false, tabWidth: 2 })
    })

    it('loads oxfmt.config.ts with default export', async () => {
      const cwd = fixturePath('load', 'ts-default')
      const configPath = 'oxfmt.config.ts'

      const result = await loadOxfmtConfig({ configPath, cwd, useCache: false })

      expect(result.config).toStrictEqual({ printWidth: 100, tabWidth: 4 })
    })

    it('loads oxfmt.config.ts with ignorePatterns', async () => {
      const cwd = fixturePath('load', 'ts-ignore')
      const configPath = 'oxfmt.config.ts'

      const result = await loadOxfmtConfig({ configPath, cwd, useCache: false })

      expect(result.config.printWidth).toBe(80)
      expect(result.config.ignorePatterns).toStrictEqual([
        'dist/**',
        'node_modules/**',
      ])
    })

    it('loads explicit .mts config path', async () => {
      await withTempDir('oxfmt-config-explicit-mts-', async cwd => {
        const configPath = join(cwd, 'custom.config.mts')
        await writeFile(
          configPath,
          'export default { printWidth: 88 }\n',
          'utf8',
        )

        const result = await loadOxfmtConfig({
          configPath,
          cwd,
          editorconfig: false,
          useCache: false,
        })

        expect(result.config.printWidth).toBe(88)
      })
    })

    it('loads explicit .cjs config path', async () => {
      await withTempDir('oxfmt-config-explicit-cjs-', async cwd => {
        const configPath = join(cwd, 'custom.config.cjs')
        await writeFile(
          configPath,
          'module.exports = { printWidth: 89 }\n',
          'utf8',
        )

        const result = await loadOxfmtConfig({
          configPath,
          cwd,
          editorconfig: false,
          useCache: false,
        })

        expect(result.config.printWidth).toBe(89)
      })
    })

    it('auto-discovers oxfmt.config.ts after JSON configs', async () => {
      const cwd = fixturePath('load', 'auto-discover')

      const result = await loadOxfmtConfig({ cwd, useCache: false })

      expect(result.config.tabWidth).toBe(2)
    })

    it('auto-discovers oxfmt.config.mts', async () => {
      await withTempDir('oxfmt-config-auto-discover-mts-', async cwd => {
        const configPath = join(cwd, 'oxfmt.config.mts')
        await writeFile(
          configPath,
          'export default { printWidth: 92 }\n',
          'utf8',
        )

        const result = await loadOxfmtConfig({
          cwd,
          editorconfig: false,
          useCache: false,
        })

        expect(result.config.printWidth).toBe(92)
        expect(result.filepath).toBe(configPath)
      })
    })

    it('resolves nested config from filepath directory by default', async () => {
      await withTempDir('oxfmt-config-by-filepath-', async cwd => {
        const nestedDir = join(cwd, 'packages', 'app', 'src')
        await mkdir(nestedDir, { recursive: true })
        await writeFile(
          join(cwd, '.oxfmtrc.json'),
          JSON.stringify({ printWidth: 120 }),
          'utf8',
        )
        await writeFile(
          join(cwd, 'packages', 'app', '.oxfmtrc.json'),
          JSON.stringify({ printWidth: 90 }),
          'utf8',
        )
        await writeFile(join(nestedDir, 'a.ts'), 'export const a = 1\n', 'utf8')

        const result = await loadOxfmtConfig({
          cwd,
          filepath: join(nestedDir, 'a.ts'),
          useCache: false,
        })

        expect(result.config.printWidth).toBe(90)
      })
    })

    it('uses cwd-based config when disableNestedConfig is true', async () => {
      await withTempDir('oxfmt-config-disable-nested-', async cwd => {
        const nestedDir = join(cwd, 'packages', 'app', 'src')
        await mkdir(nestedDir, { recursive: true })
        await writeFile(
          join(cwd, '.oxfmtrc.json'),
          JSON.stringify({ printWidth: 120 }),
          'utf8',
        )
        await writeFile(
          join(cwd, 'packages', 'app', '.oxfmtrc.json'),
          JSON.stringify({ printWidth: 90 }),
          'utf8',
        )
        await writeFile(join(nestedDir, 'a.ts'), 'export const a = 1\n', 'utf8')

        const result = await loadOxfmtConfig({
          cwd,
          disableNestedConfig: true,
          filepath: join(nestedDir, 'a.ts'),
          useCache: false,
        })

        expect(result.config.printWidth).toBe(120)
      })
    })
  })
})
