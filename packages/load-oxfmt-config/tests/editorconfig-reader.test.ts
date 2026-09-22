import { writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { readEditorconfigFromFile } from '../src/editorconfig'
import { fixturePath, withTempDir } from './helpers'

describe('readEditorconfigFromFile', () => {
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
