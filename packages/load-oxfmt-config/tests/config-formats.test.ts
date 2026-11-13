import { writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { loadOxfmtConfig } from '../src'
import { fixturePath, withTempDir } from './helpers'

describe('loadOxfmtConfig', () => {
  describe('metadata', () => {
    it('returns merged config with resolved filepath and dirname', async () => {
      const cwd = fixturePath('load', 'json')

      const result = await loadOxfmtConfig({
        configPath: '.oxfmtrc.json',
        cwd,
        useCache: false,
      })

      expect(result.config).toStrictEqual({ printWidth: 80, semi: false })
      expect(result.filepath).toBe(join(cwd, '.oxfmtrc.json'))
      expect(result.dirname).toBe(cwd)
    })

    it('returns metadata as undefined when no config is found', async () => {
      await withTempDir('oxfmt-config-missing-', async cwd => {
        const result = await loadOxfmtConfig({ cwd, useCache: false })

        expect(result.config).toStrictEqual({})
        expect(result.filepath).toBeUndefined()
        expect(result.dirname).toBeUndefined()
      })
    })

    it.each([
      ['.js', 'export default { printWidth: 91 }\n', 91],
      ['.mjs', 'export default { printWidth: 92 }\n', 92],
      ['.cjs', 'module.exports = { printWidth: 93 }\n', 93],
      ['.ts', 'export default { printWidth: 94 }\n', 94],
      ['.mts', 'export default { printWidth: 95 }\n', 95],
      ['.cts', 'export default { printWidth: 96 }\n', 96],
    ])(
      'loads explicit %s config path and returns metadata',
      async (extension, content, expectedPrintWidth) => {
        await withTempDir('oxfmt-config-explicit-ext-', async cwd => {
          const configPath = join(cwd, `custom.config${extension}`)
          await writeFile(configPath, content, 'utf8')

          const result = await loadOxfmtConfig({
            configPath,
            cwd,
            editorconfig: false,
            useCache: false,
          })

          expect(result.config.printWidth).toBe(expectedPrintWidth)
          expect(result.filepath).toBe(configPath)
          expect(result.dirname).toBe(cwd)
        })
      },
    )

    it('throws when explicit JS config has no default export', async () => {
      await withTempDir('oxfmt-config-explicit-js-no-default-', async cwd => {
        const configPath = join(cwd, 'custom.config.mjs')
        await writeFile(configPath, 'export const printWidth = 97\n', 'utf8')

        await expect(
          loadOxfmtConfig({
            configPath,
            cwd,
            editorconfig: false,
            useCache: false,
          }),
        ).rejects.toThrow(/Configuration file has no default export/u)
      })
    })

    it('throws when explicit JS config default export is not an object', async () => {
      await withTempDir('oxfmt-config-explicit-js-non-object-', async cwd => {
        const configPath = join(cwd, 'custom.config.mjs')
        await writeFile(configPath, 'export default ["printWidth"]\n', 'utf8')

        await expect(
          loadOxfmtConfig({
            configPath,
            cwd,
            editorconfig: false,
            useCache: false,
          }),
        ).rejects.toThrow(
          /Configuration file must have a default export that is an object/u,
        )
      })
    })

    it.each([
      ['function', 'export default () => ({ printWidth: 98 })\n'],
      ['Date', 'export default new Date()\n'],
      ['Map', 'export default new Map()\n'],
      ['Promise', 'export default Promise.resolve({})\n'],
    ])(
      'throws when explicit JS config exports a %s',
      async (_name, content) => {
        await withTempDir(
          'oxfmt-config-explicit-js-invalid-object-',
          async cwd => {
            const configPath = join(cwd, 'custom.config.mjs')
            await writeFile(configPath, content, 'utf8')

            await expect(
              loadOxfmtConfig({
                configPath,
                cwd,
                editorconfig: false,
                useCache: false,
              }),
            ).rejects.toThrow(
              /Configuration file must have a default export that is an object/u,
            )
          },
        )
      },
    )

    it('loads explicit .json and .jsonc config path with custom filename', async () => {
      await withTempDir('oxfmt-config-explicit-json-', async cwd => {
        const jsonPath = join(cwd, 'custom.config.json')
        const jsoncPath = join(cwd, 'custom.config.jsonc')

        await writeFile(jsonPath, '{"printWidth":101}\n', 'utf8')
        await writeFile(
          jsoncPath,
          '{\n  // comment\n  "printWidth": 102\n}\n',
          'utf8',
        )

        const jsonResult = await loadOxfmtConfig({
          configPath: jsonPath,
          cwd,
          editorconfig: false,
          useCache: false,
        })
        const jsoncResult = await loadOxfmtConfig({
          configPath: jsoncPath,
          cwd,
          editorconfig: false,
          useCache: false,
        })

        expect(jsonResult.config.printWidth).toBe(101)
        expect(jsoncResult.config.printWidth).toBe(102)
      })
    })

    it('loads explicit JSONC config with trailing comma', async () => {
      await withTempDir(
        'oxfmt-config-explicit-jsonc-trailing-comma-',
        async cwd => {
          const configPath = join(cwd, 'custom.config.jsonc')
          await writeFile(
            configPath,
            '{\n  // comment\n  "printWidth": 110,\n}\n',
            'utf8',
          )

          const result = await loadOxfmtConfig({
            configPath,
            cwd,
            editorconfig: false,
            useCache: false,
          })

          expect(result.config).toStrictEqual({ printWidth: 110 })
        },
      )
    })

    it('loads explicit empty JSONC config as empty object', async () => {
      await withTempDir('oxfmt-config-explicit-jsonc-empty-', async cwd => {
        const configPath = join(cwd, 'custom.config.jsonc')
        await writeFile(configPath, '', 'utf8')

        const result = await loadOxfmtConfig({
          configPath,
          cwd,
          editorconfig: false,
          useCache: false,
        })

        expect(result.config).toStrictEqual({})
      })
    })

    it('throws for unsupported explicit config extension', async () => {
      await withTempDir('oxfmt-config-explicit-unsupported-', async cwd => {
        const configPath = join(cwd, 'custom.config.yaml')
        await writeFile(configPath, 'printWidth: 88\n', 'utf8')

        await expect(
          loadOxfmtConfig({
            configPath,
            cwd,
            editorconfig: false,
            useCache: false,
          }),
        ).rejects.toThrow(/Unsupported oxfmt config extension/u)
      })
    })

    it('throws for invalid explicit JSONC config', async () => {
      await withTempDir('oxfmt-config-explicit-jsonc-invalid-', async cwd => {
        const configPath = join(cwd, 'custom.config.jsonc')
        await writeFile(configPath, '{\n  "printWidth": 100,,\n}\n', 'utf8')

        await expect(
          loadOxfmtConfig({
            configPath,
            cwd,
            editorconfig: false,
            useCache: false,
          }),
        ).rejects.toThrow(/Failed to parse oxfmt configuration file/u)
      })
    })
  })
})
