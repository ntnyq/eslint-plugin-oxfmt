import { cp, mkdir, readFile, utimes, writeFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { dirname, join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { loadOxfmtConfig } from '../src'
import { fixturePath, withTempDir } from './helpers'

describe('loadOxfmtConfig', () => {
  describe('cache behavior', () => {
    it('returns cached config when useCache is enabled', async () => {
      const cwd = fixturePath('load', 'cache-enabled')
      const configPath = '.oxfmtrc.json'

      const first = await loadOxfmtConfig({ configPath, cwd })
      const cached = await loadOxfmtConfig({ configPath, cwd })

      expect(cached.config).toBe(first.config)
    })

    it('bypasses cache when useCache is false', async () => {
      const cwd = fixturePath('load', 'cache-bypass')
      const configPath = '.oxfmtrc.json'

      const cached = await loadOxfmtConfig({ configPath, cwd })

      const fresh = await loadOxfmtConfig({ configPath, cwd, useCache: false })

      expect(fresh.config).toStrictEqual({ tabWidth: 2, useTabs: false })
      expect(fresh.config).not.toBe(cached.config)
    })

    it.each([
      {
        expectedPrintWidth: 72,
        filename: 'oxfmt.config.ts',
        firstContent: 'export default { printWidth: 71 }\n',
        name: 'TypeScript config',
        secondContent: 'export default { printWidth: 72 }\n',
      },
      {
        expectedPrintWidth: 74,
        filename: 'oxfmt.config.mjs',
        firstContent: 'export default { printWidth: 73 }\n',
        name: 'ESM .mjs config',
        secondContent: 'export default { printWidth: 74 }\n',
      },
      {
        expectedPrintWidth: 76,
        filename: 'oxfmt.config.js',
        firstContent: 'module.exports = { printWidth: 75 }\n',
        name: 'CommonJS .js config',
        secondContent: 'module.exports = { printWidth: 76 }\n',
      },
      {
        expectedPrintWidth: 78,
        filename: 'oxfmt.config.cjs',
        firstContent: 'module.exports = { printWidth: 77 }\n',
        name: 'CommonJS .cjs config',
        secondContent: 'module.exports = { printWidth: 78 }\n',
      },
    ])('reloads changed $name when useCache is false', async testCase => {
      await withTempDir('oxfmt-config-js-cache-bypass-', async cwd => {
        const configPath = join(cwd, testCase.filename)
        await writeFile(configPath, testCase.firstContent, 'utf8')

        const first = await loadOxfmtConfig({
          configPath,
          cwd,
          editorconfig: false,
          useCache: false,
        })

        await writeFile(configPath, testCase.secondContent, 'utf8')

        const second = await loadOxfmtConfig({
          configPath,
          cwd,
          editorconfig: false,
          useCache: false,
        })

        expect(second.config.printWidth).not.toBe(first.config.printWidth)
        expect(second.config.printWidth).toBe(testCase.expectedPrintWidth)
      })
    })

    it('reloads same-size changed ESM .js config when mtime is unchanged', async () => {
      await withTempDir('oxfmt-config-js-esm-cache-bypass-', async cwd => {
        const configPath = join(cwd, 'oxfmt.config.js')
        const configMtime = new Date('2026-01-01T00:00:00.000Z')
        await writeFile(
          join(cwd, 'package.json'),
          '{"type":"module"}\n',
          'utf8',
        )
        await writeFile(
          configPath,
          'export default { printWidth: 79 }\n',
          'utf8',
        )
        await utimes(configPath, configMtime, configMtime)

        const first = await loadOxfmtConfig({
          configPath,
          cwd,
          editorconfig: false,
          useCache: false,
        })

        await writeFile(
          configPath,
          'export default { printWidth: 80 }\n',
          'utf8',
        )
        await utimes(configPath, configMtime, configMtime)

        const second = await loadOxfmtConfig({
          configPath,
          cwd,
          editorconfig: false,
          useCache: false,
        })

        expect(second.config.printWidth).not.toBe(first.config.printWidth)
        expect(second.config.printWidth).toBe(80)
      })
    })

    it('evaluates ESM .js config once when useCache is false', async () => {
      await withTempDir('oxfmt-config-js-esm-single-evaluation-', async cwd => {
        const globals = globalThis as {
          loadOxfmtConfigJsImportCount?: number
        } & typeof globalThis
        const configPath = join(cwd, 'oxfmt.config.js')

        globals.loadOxfmtConfigJsImportCount = 0

        try {
          await writeFile(
            join(cwd, 'package.json'),
            '{"type":"module"}\n',
            'utf8',
          )
          await writeFile(
            configPath,
            [
              'globalThis.loadOxfmtConfigJsImportCount =',
              '  (globalThis.loadOxfmtConfigJsImportCount ?? 0) + 1',
              'export default { printWidth: globalThis.loadOxfmtConfigJsImportCount }',
              '',
            ].join('\n'),
            'utf8',
          )

          const result = await loadOxfmtConfig({
            configPath,
            cwd,
            editorconfig: false,
            useCache: false,
          })

          expect(result.config.printWidth).toBe(1)
          expect(globals.loadOxfmtConfigJsImportCount).toBe(1)
        } finally {
          delete globals.loadOxfmtConfigJsImportCount
        }
      })
    })

    it('loads native ESM config with bare package imports when useCache is false', async () => {
      await withTempDir('oxfmt-config-esm-bare-import-', async cwd => {
        const configPath = join(cwd, 'oxfmt.config.mjs')
        const require = createRequire(import.meta.url)
        await cp(
          dirname(require.resolve('ignore/package.json')),
          join(cwd, 'node_modules/ignore'),
          { recursive: true },
        )

        await writeFile(
          configPath,
          "import createIgnore from 'ignore'\nconst ig = createIgnore()\nexport default { printWidth: ig ? 85 : 0 }\n",
          'utf8',
        )

        const result = await loadOxfmtConfig({
          configPath,
          cwd,
          editorconfig: false,
          useCache: false,
        })

        expect(result.config.printWidth).toBe(85)
      })
    })

    it('reloads changed CommonJS config helper when useCache is false', async () => {
      await withTempDir('oxfmt-config-cjs-helper-cache-bypass-', async cwd => {
        const configPath = join(cwd, 'oxfmt.config.cjs')
        const helperPath = join(cwd, 'shared.cjs')

        await writeFile(
          configPath,
          "module.exports = require('./shared.cjs')\n",
          'utf8',
        )
        await writeFile(helperPath, 'module.exports = { printWidth: 81 }\n')

        const first = await loadOxfmtConfig({
          configPath,
          cwd,
          editorconfig: false,
          useCache: false,
        })

        await writeFile(helperPath, 'module.exports = { printWidth: 82 }\n')

        const second = await loadOxfmtConfig({
          configPath,
          cwd,
          editorconfig: false,
          useCache: false,
        })

        expect(first.config.printWidth).toBe(81)
        expect(second.config.printWidth).toBe(82)
      })
    })

    it('preserves third-party CommonJS modules when useCache is false', async () => {
      await withTempDir('oxfmt-config-cjs-dependency-cache-', async cwd => {
        const dependencyDir = join(cwd, 'node_modules', 'shared-package')
        const dependencyPath = join(dependencyDir, 'index.cjs')
        const configPath = join(cwd, 'oxfmt.config.cjs')
        const requireFromCwd = createRequire(join(cwd, 'consumer.cjs'))

        await mkdir(dependencyDir, { recursive: true })
        await writeFile(
          join(dependencyDir, 'package.json'),
          JSON.stringify({ main: 'index.cjs', name: 'shared-package' }),
          'utf8',
        )
        await writeFile(
          dependencyPath,
          'module.exports = { printWidth: 86 }\n',
          'utf8',
        )
        await writeFile(
          configPath,
          "module.exports = require('shared-package')\n",
          'utf8',
        )

        const dependency = requireFromCwd('shared-package')

        try {
          await loadOxfmtConfig({
            configPath,
            cwd,
            editorconfig: false,
            useCache: false,
          })
          await loadOxfmtConfig({
            configPath,
            cwd,
            editorconfig: false,
            useCache: false,
          })

          expect(requireFromCwd('shared-package')).toBe(dependency)
        } finally {
          Reflect.deleteProperty(requireFromCwd.cache, dependencyPath)
        }
      })
    })

    it.each([
      { filename: 'oxfmt.config.mjs' },
      { filename: 'oxfmt.config.js' },
    ])(
      'does not reload changed ESM config helper for $filename when useCache is false',
      async testCase => {
        await withTempDir(
          'oxfmt-config-esm-helper-cache-bypass-',
          async cwd => {
            const configPath = join(cwd, testCase.filename)
            const helperPath = join(cwd, 'shared.mjs')

            await writeFile(join(cwd, 'package.json'), '{"type":"module"}\n')
            await writeFile(
              configPath,
              "import width from './shared.mjs'\nexport default { printWidth: width }\n",
              'utf8',
            )
            await writeFile(helperPath, 'export default 83\n', 'utf8')

            const first = await loadOxfmtConfig({
              configPath,
              cwd,
              editorconfig: false,
              useCache: false,
            })

            await writeFile(helperPath, 'export default 84\n', 'utf8')

            const second = await loadOxfmtConfig({
              configPath,
              cwd,
              editorconfig: false,
              useCache: false,
            })

            expect(first.config.printWidth).toBe(83)
            expect(second.config.printWidth).toBe(83)
          },
        )
      },
    )

    it('does not retry config evaluation errors through JavaScript fallbacks', async () => {
      await withTempDir('oxfmt-config-js-evaluation-error-', async cwd => {
        const configPath = join(cwd, 'oxfmt.config.js')
        const counterPath = join(cwd, 'counter.txt')

        await writeFile(counterPath, '0', 'utf8')
        await writeFile(
          configPath,
          [
            "const { readFileSync, writeFileSync } = require('node:fs')",
            `const counterPath = ${JSON.stringify(counterPath)}`,
            "const count = Number(readFileSync(counterPath, 'utf8'))",
            'writeFileSync(counterPath, String(count + 1))',
            "throw new Error('boom from config')",
            '',
          ].join('\n'),
          'utf8',
        )

        await expect(
          loadOxfmtConfig({
            configPath,
            cwd,
            editorconfig: false,
            useCache: false,
          }),
        ).rejects.toThrow(/boom from config/u)

        await expect(readFile(counterPath, 'utf8')).resolves.toBe('1')
      })
    })

    it('does not retry runtime SyntaxErrors through JavaScript fallbacks', async () => {
      await withTempDir('oxfmt-config-js-syntax-error-', async cwd => {
        const configPath = join(cwd, 'oxfmt.config.js')
        const counterPath = join(cwd, 'counter.txt')

        await writeFile(counterPath, '0', 'utf8')
        await writeFile(
          configPath,
          [
            "const { readFileSync, writeFileSync } = require('node:fs')",
            `const counterPath = ${JSON.stringify(counterPath)}`,
            "const count = Number(readFileSync(counterPath, 'utf8'))",
            'writeFileSync(counterPath, String(count + 1))',
            'throw new SyntaxError("Unexpected token \'export\'")',
            '',
          ].join('\n'),
          'utf8',
        )

        await expect(
          loadOxfmtConfig({
            configPath,
            cwd,
            editorconfig: false,
            useCache: false,
          }),
        ).rejects.toThrow(/Unexpected token 'export'/u)

        await expect(readFile(counterPath, 'utf8')).resolves.toBe('1')
      })
    })

    it('falls back for module syntax errors in CommonJS .js files', async () => {
      await withTempDir('oxfmt-config-js-module-syntax-', async cwd => {
        const configPath = join(cwd, 'oxfmt.config.js')

        await writeFile(join(cwd, 'package.json'), '{"type":"commonjs"}\n')
        await writeFile(
          configPath,
          'export default { printWidth: 87 }\n',
          'utf8',
        )

        const result = await loadOxfmtConfig({
          configPath,
          cwd,
          editorconfig: false,
          useCache: false,
        })

        expect(result.config.printWidth).toBe(87)
      })
    })

    it('reuses unchanged native ESM config module URL when useCache is false', async () => {
      await withTempDir('oxfmt-config-js-esm-cache-key-', async cwd => {
        const globals = globalThis as {
          loadOxfmtConfigImportCount?: number
        } & typeof globalThis
        const configPath = join(cwd, 'oxfmt.config.mjs')

        globals.loadOxfmtConfigImportCount = 0

        try {
          await writeFile(
            configPath,
            [
              'globalThis.loadOxfmtConfigImportCount =',
              '  (globalThis.loadOxfmtConfigImportCount ?? 0) + 1',
              'export default { printWidth: globalThis.loadOxfmtConfigImportCount }',
              '',
            ].join('\n'),
            'utf8',
          )

          const first = await loadOxfmtConfig({
            configPath,
            cwd,
            editorconfig: false,
            useCache: false,
          })
          const second = await loadOxfmtConfig({
            configPath,
            cwd,
            editorconfig: false,
            useCache: false,
          })

          expect(first.config.printWidth).toBe(1)
          expect(second.config.printWidth).toBe(1)
          expect(globals.loadOxfmtConfigImportCount).toBe(1)
        } finally {
          delete globals.loadOxfmtConfigImportCount
        }
      })
    })

    it('preserves ignorePatterns with cache enabled', async () => {
      const cwd = fixturePath('load', 'ignore-cache')
      const configPath = '.oxfmtrc.json'

      const first = await loadOxfmtConfig({ configPath, cwd })
      const cached = await loadOxfmtConfig({ configPath, cwd })

      expect(cached.config).toBe(first.config)
      expect(cached.config.ignorePatterns).toStrictEqual(
        first.config.ignorePatterns,
      )
      expect(cached.config.ignorePatterns).toStrictEqual(['*.tmp'])
    })

    it('preserves cached .editorconfig results until cache is bypassed', async () => {
      const cwd = fixturePath('load', 'editor-cache')

      const first = await loadOxfmtConfig({ cwd })

      const cached = await loadOxfmtConfig({ cwd })
      const fresh = await loadOxfmtConfig({ cwd, useCache: false })

      expect(first.config.tabWidth).toBe(2)
      expect(cached.config.tabWidth).toBe(2)
      expect(cached.config).toBe(first.config)
      expect(fresh).not.toBe(first)
      expect(fresh.config.tabWidth).toBe(2)
    })

    it('keeps editorconfig onlyCwd cache isolated from default walking', async () => {
      await withTempDir('oxfmt-config-editor-cache-only-cwd-', async cwd => {
        const child = join(cwd, 'packages', 'app')
        await mkdir(child, { recursive: true })
        await writeFile(
          join(cwd, '.editorconfig'),
          '[*]\nindent_style = space\nindent_size = 2\n',
          'utf8',
        )
        await writeFile(join(child, '.oxfmtrc.json'), '{}\n', 'utf8')

        const withWalk = await loadOxfmtConfig({ cwd: child })
        const onlyCwd = await loadOxfmtConfig({
          cwd: child,
          editorconfig: { onlyCwd: true },
        })

        expect(withWalk.config).toStrictEqual({ tabWidth: 2, useTabs: false })
        expect(onlyCwd.config).toStrictEqual({})
      })
    })

    it('keeps default editorconfig cache isolated after onlyCwd miss', async () => {
      await withTempDir(
        'oxfmt-config-editor-cache-only-cwd-miss-',
        async cwd => {
          const child = join(cwd, 'packages', 'app')
          await mkdir(child, { recursive: true })
          await writeFile(
            join(cwd, '.editorconfig'),
            '[*]\nindent_style = space\nindent_size = 2\n',
            'utf8',
          )
          await writeFile(join(child, '.oxfmtrc.json'), '{}\n', 'utf8')

          const onlyCwd = await loadOxfmtConfig({
            cwd: child,
            editorconfig: { onlyCwd: true },
          })
          const withWalk = await loadOxfmtConfig({ cwd: child })

          expect(onlyCwd.config).toStrictEqual({})
          expect(withWalk.config).toStrictEqual({
            tabWidth: 2,
            useTabs: false,
          })
        },
      )
    })
  })
})
