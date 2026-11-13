import { writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { loadOxfmtConfig } from '../src'
import { fixturePath, withTempDir } from './helpers'

describe('loadOxfmtConfig', () => {
  describe('editorconfig behavior', () => {
    it('loads .editorconfig root options with local empty oxfmt config', async () => {
      const cwd = fixturePath('load', 'editor-root')

      const result = await loadOxfmtConfig({ cwd, useCache: false })

      expect(result.config).toStrictEqual({
        endOfLine: 'crlf',
        insertFinalNewline: false,
        printWidth: 90,
        tabWidth: 4,
        useTabs: false,
      })
    })

    it.each([
      ['single', { singleQuote: true }],
      ['double', { singleQuote: false }],
      ['auto', {}],
      ['invalid', {}],
    ])(
      'maps .editorconfig quote_type=%s into oxfmt options',
      async (fixtureName, expected) => {
        const cwd = fixturePath('load', 'editor-quote-type', fixtureName)

        const result = await loadOxfmtConfig({ cwd, useCache: false })

        expect(result.config).toStrictEqual(expected)
      },
    )

    it('uses .oxfmtrc root fields over .editorconfig fallback values', async () => {
      const cwd = fixturePath('load', 'editor-fallback')

      const result = await loadOxfmtConfig({ cwd, useCache: false })

      expect(result.config.printWidth).toBe(120)
      expect(result.config.useTabs).toBeFalsy()
      expect(result.config.tabWidth).toBe(8)
    })

    it('keeps .editorconfig override fields as fallbacks to root config', async () => {
      await withTempDir('oxfmt-config-editor-override-fallback-', async cwd => {
        await writeFile(
          join(cwd, '.oxfmtrc.json'),
          JSON.stringify({ printWidth: 120 }),
          'utf8',
        )
        await writeFile(
          join(cwd, '.editorconfig'),
          [
            '[*.ts]',
            'indent_style = space',
            'indent_size = 4',
            'max_line_length = 80',
            '',
          ].join('\n'),
          'utf8',
        )

        const result = await loadOxfmtConfig({ cwd, useCache: false })

        expect(result.config).toStrictEqual({
          printWidth: 120,
          overrides: [
            {
              files: ['**/*.ts'],
              options: { tabWidth: 4, useTabs: false },
            },
          ],
        })
      })
    })

    it('converts .editorconfig sections into low-priority overrides', async () => {
      const cwd = fixturePath('load', 'editor-overrides')

      const result = await loadOxfmtConfig({ cwd, useCache: false })

      expect(result.config.tabWidth).toBe(2)
      expect(result.config.overrides).toStrictEqual([
        {
          files: ['**/*.ts'],
          options: { tabWidth: 4 },
        },
        {
          files: ['**/*.md'],
          options: { printWidth: 72 },
        },
        {
          files: ['src/**/*.ts'],
          options: { printWidth: 100 },
        },
      ])
    })

    it('uses the nearest .editorconfig when multiple files exist', async () => {
      const root = fixturePath('load', 'editor-nearest', 'root')
      const child = join(root, 'packages', 'app')

      const result = await loadOxfmtConfig({ cwd: child, useCache: false })

      expect(result.config.tabWidth).toBe(2)
      expect(result.config.useTabs).toBeTruthy()
    })

    it('uses explicit tab_width when .editorconfig indent_style is tab', async () => {
      const cwd = fixturePath('load', 'editor-tab-width')

      const result = await loadOxfmtConfig({ cwd, useCache: false })

      expect(result.config.useTabs).toBeTruthy()
      expect(result.config.tabWidth).toBe(6)
    })

    it('treats [**] sections as overrides when loading .editorconfig', async () => {
      const cwd = fixturePath('load', 'editor-double-star')

      const result = await loadOxfmtConfig({ cwd, useCache: false })

      expect(result.config.printWidth).toBeUndefined()
      expect(result.config.tabWidth).toBeUndefined()
      expect(result.config.useTabs).toBeUndefined()
      expect(result.config.overrides).toStrictEqual([
        {
          files: ['**'],
          options: {
            printWidth: 90,
            tabWidth: 3,
            useTabs: false,
          },
        },
      ])
    })

    it('rebases .editorconfig overrides to the discovered oxfmt config directory', async () => {
      const root = fixturePath('load', 'editor-rebase', 'root')
      const child = join(root, 'packages', 'app')

      const result = await loadOxfmtConfig({ cwd: child, useCache: false })

      expect(result.config.semi).toBeFalsy()
      expect(result.config.tabWidth).toBe(2)
      expect(result.config.overrides).toStrictEqual([
        {
          files: ['packages/app/src/**/*.ts'],
          options: { printWidth: 120 },
        },
      ])
    })

    it('skips .editorconfig entirely when editorconfig is false', async () => {
      const cwd = fixturePath('load', 'editor-root')

      const result = await loadOxfmtConfig({
        cwd,
        editorconfig: false,
        useCache: false,
      })

      expect(result.config).toStrictEqual({})
    })

    it('finds .editorconfig in cwd when onlyCwd is true', async () => {
      const cwd = fixturePath('load', 'editor-root')

      const result = await loadOxfmtConfig({
        cwd,
        editorconfig: { onlyCwd: true },
        useCache: false,
      })

      expect(result.config).toStrictEqual({
        endOfLine: 'crlf',
        insertFinalNewline: false,
        printWidth: 90,
        tabWidth: 4,
        useTabs: false,
      })
    })

    it('does not walk up to parent .editorconfig when onlyCwd is true', async () => {
      const root = fixturePath('load', 'editor-option', 'root')
      const child = join(root, 'packages', 'app')

      const withWalk = await loadOxfmtConfig({ cwd: child, useCache: false })
      const withoutWalk = await loadOxfmtConfig({
        cwd: child,
        editorconfig: { onlyCwd: true },
        useCache: false,
      })

      expect(withWalk.config.tabWidth).toBe(4)
      expect(withoutWalk.config).toStrictEqual({})
    })

    it('resolves .editorconfig from editorconfig.cwd instead of config directory', async () => {
      const cwd = fixturePath('load', 'editor-cwd')
      const editorconfigDir = join(cwd, 'alt')

      const result = await loadOxfmtConfig({
        cwd,
        editorconfig: { cwd: editorconfigDir },
        useCache: false,
      })

      expect(result.config.semi).toBeTruthy()
      expect(result.config.tabWidth).toBe(8)
      expect(result.config.printWidth).toBe(120)
    })

    it('does not use editorconfig.cwd directory when editorconfig.cwd is not set', async () => {
      const cwd = fixturePath('load', 'editor-cwd')

      const result = await loadOxfmtConfig({
        cwd,
        useCache: false,
      })

      expect(result.config.semi).toBeTruthy()
      expect(result.config.tabWidth).toBeUndefined()
      expect(result.config.printWidth).toBeUndefined()
    })
  })
})
