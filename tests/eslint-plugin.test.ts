import { platform } from 'node:os'
import { ESLint } from 'eslint'
import { glob } from 'tinyglobby'
import { expect, it } from 'vitest'
import { resolve } from '../scripts/utils'
import pluginOxfmt from '../src'

const TEST_CWD = resolve('tests/fixtures/eslint-plugin')

it.runIf(platform() === 'darwin' || platform() === 'linux')(
  'should lint work',
  async () => {
    const files = await glob('**/*.{js,ts}', { cwd: TEST_CWD, onlyFiles: true })
    const eslint = new ESLint({
      cwd: TEST_CWD,
      ignore: false,
      overrideConfigFile: true,
      overrideConfig: [
        // recommended config
        {
          ...pluginOxfmt.configs.recommended,
          files: ['**/*.{js,ts}'],
        },
      ],
    })

    const results = await eslint.lintFiles(files)

    expect(results.length).toBe(files.length)
    results.forEach((result, idx) => {
      expect(result.messages).toMatchSnapshot(files[idx])
    })
  },
)
