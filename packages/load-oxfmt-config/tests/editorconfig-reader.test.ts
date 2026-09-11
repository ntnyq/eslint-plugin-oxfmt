import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { readEditorconfigFromFile } from '../src/editorconfig'
import { fixturePath } from './helpers'

describe('readEditorconfigFromFile', () => {
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
