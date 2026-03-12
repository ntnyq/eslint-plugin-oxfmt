import { platform } from 'node:os'
import { ESLint } from 'eslint'
import { glob } from 'tinyglobby'
import { expect, it } from 'vitest'
import { resolve } from '../scripts/utils'
import pluginOxfmt from '../src'

const FIXTURE_BASE_CWD = resolve('tests/fixtures/base')
const FIXTURE_USE_CONFIG_CWD = resolve('tests/fixtures/use-config')

it.runIf(platform() === 'darwin' || platform() === 'linux')(
  'should lint work',
  async () => {
    const files = await glob('**/*.{js,ts}', {
      cwd: FIXTURE_BASE_CWD,
      onlyFiles: true,
    })
    const eslint = new ESLint({
      cwd: FIXTURE_BASE_CWD,
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

it.runIf(platform() === 'darwin' || platform() === 'linux')(
  'should respect ignorePatterns from .oxfmtrc when useConfig is true',
  async () => {
    const files = await glob('**/*.js', {
      cwd: FIXTURE_USE_CONFIG_CWD,
      onlyFiles: true,
    })
    const eslint = new ESLint({
      cwd: FIXTURE_USE_CONFIG_CWD,
      ignore: false,
      overrideConfigFile: true,
      overrideConfig: [
        {
          ...pluginOxfmt.configs.recommended,
          files: ['**/*.js'],
        },
      ],
    })

    const results = await eslint.lintFiles(files)

    results.forEach((result, idx) => {
      expect(result.messages).toMatchSnapshot(files[idx])
    })
  },
)

it.runIf(platform() === 'darwin' || platform() === 'linux')(
  'should prioritize rule ignorePatterns over .oxfmtrc ignorePatterns',
  async () => {
    const files = await glob('**/*.js', {
      cwd: FIXTURE_USE_CONFIG_CWD,
      onlyFiles: true,
    })
    const eslint = new ESLint({
      cwd: FIXTURE_USE_CONFIG_CWD,
      ignore: false,
      overrideConfigFile: true,
      overrideConfig: [
        {
          ...pluginOxfmt.configs.recommended,
          files: ['**/*.js'],
          rules: {
            'oxfmt/oxfmt': [
              'error',
              {
                ignorePatterns: ['**/src/**'],
              },
            ],
          },
        },
      ],
    })

    const results = await eslint.lintFiles(files)

    results.forEach((result, idx) => {
      expect(result.messages).toMatchSnapshot(files[idx])
    })
  },
)
