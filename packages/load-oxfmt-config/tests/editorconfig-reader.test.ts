import { writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { readEditorconfigFromFile } from '../src/editorconfig'
import { fixturePath, withTempDir } from './helpers'

describe('readEditorconfigFromFile', () => {
  it.each([
    { properties: 'indent_size = 4', tabWidth: 4 },
    { properties: 'indent_style = tab\nindent_size = 4', tabWidth: 4 },
    {
      properties: 'indent_style = space\nindent_size = 4\ntab_width = 8',
      tabWidth: 4,
    },
    {
      properties: 'indent_style = tab\nindent_size = 4\ntab_width = 8',
      tabWidth: 8,
    },
    { properties: 'indent_size = 4\ntab_width = 8', tabWidth: 8 },
    { properties: 'indent_size = 4\ntab_width = unset', tabWidth: 4 },
    { properties: 'indent_size = tab\ntab_width = 8', tabWidth: 8 },
    { properties: 'tab_width = 260', tabWidth: 260 },
  ])('resolves tabWidth from $properties', async ({ properties, tabWidth }) => {
    await withTempDir('oxfmt-editorconfig-width-', async cwd => {
      const filepath = join(cwd, '.editorconfig')
      await writeFile(filepath, `root = true\n[*]\n${properties}\n`)

      for (const options of [{}, { filepath: join(cwd, 'test.js') }]) {
        const result = await readEditorconfigFromFile(filepath, cwd, options)
        expect(result.rootOptions.tabWidth).toBe(tabWidth)
      }
    })
  })

  it.each([
    { properties: 'tab_width = 8', tabWidth: 8 },
    { properties: 'indent_style = tab\ntab_width = 8', tabWidth: 8 },
    { properties: 'indent_style = space\ntab_width = 8', tabWidth: 4 },
    { properties: 'indent_style = tab\ntab_width = 260', tabWidth: 260 },
  ])(
    'inherits $properties before resolving scoped indent_size',
    async ({ properties, tabWidth }) => {
      await withTempDir('oxfmt-editorconfig-inherited-width-', async cwd => {
        const filepath = join(cwd, '.editorconfig')
        await writeFile(
          filepath,
          `root = true\n[*]\n${properties}\n[*.js]\nindent_size = 4\n`,
        )

        const perFile = await readEditorconfigFromFile(filepath, cwd, {
          filepath: join(cwd, 'test.js'),
        })
        expect(perFile.rootOptions.tabWidth).toBe(tabWidth)

        const result = await readEditorconfigFromFile(filepath, cwd)
        expect(result.overrides).toStrictEqual([
          { files: ['**/*.js'], options: { tabWidth } },
        ])
      })
    },
  )

  it.each([
    { properties: 'indent_size = 4', tabWidth: 8 },
    { properties: 'indent_size = 4\ntab_width = unset', tabWidth: 4 },
  ])(
    'resolves overlapping scoped widths with $properties',
    async ({ properties, tabWidth }) => {
      await withTempDir('oxfmt-editorconfig-scoped-width-', async cwd => {
        const filepath = join(cwd, '.editorconfig')
        await writeFile(
          filepath,
          `root = true\n[*.js]\ntab_width = 8\n[test.*]\n${properties}\n`,
        )

        const result = await readEditorconfigFromFile(filepath, cwd, {
          filepath: join(cwd, 'test.js'),
        })
        expect(result.rootOptions.tabWidth).toBe(tabWidth)

        const unmatched = await readEditorconfigFromFile(filepath, cwd, {
          filepath: join(cwd, 'test.ts'),
        })
        expect(unmatched.rootOptions.tabWidth).toBe(4)
      })
    },
  )

  it('normalizes basename patterns and preserves later global overrides in static results', async () => {
    await withTempDir('oxfmt-editorconfig-order-', async cwd => {
      const filepath = join(cwd, '.editorconfig')
      await writeFile(
        filepath,
        '[*.js]\nquote_type = single\n[*]\nquote_type = double\n',
      )

      expect(await readEditorconfigFromFile(filepath, cwd)).toEqual({
        rootOptions: { singleQuote: false },
        overrides: [
          { files: ['**/*.js'], options: { singleQuote: true } },
          { files: ['**'], options: { singleQuote: false } },
        ],
      })
    })
  })

  it('treats [**] sections as overrides instead of root options', async () => {
    const cwd = fixturePath('load', 'editor-double-star')

    const config = await readEditorconfigFromFile(
      join(cwd, '.editorconfig'),
      cwd,
    )

    expect(config).toStrictEqual({
      rootOptions: {},
      overrides: [
        {
          files: ['**'],
          options: {
            printWidth: 90,
            tabWidth: 3,
            useTabs: false,
          },
        },
      ],
    })
  })
})
