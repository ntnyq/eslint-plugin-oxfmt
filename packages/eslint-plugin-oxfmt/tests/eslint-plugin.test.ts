import { ESLint } from 'eslint'
import { glob } from 'tinyglobby'
import { expect, it } from 'vitest'
import pluginOxfmt from '../src'
import {
  FIXTURE_BASE_CWD,
  FIXTURE_USE_CONFIG_CWD,
  lintFixtureFiles,
  mapResultsByFilePath,
  normalizeLintMessagesForSnapshot,
} from './helpers/fixtures'
import { resolvePackagePath } from './helpers/paths'

it('should lint work', async () => {
  const files = await glob('**/*.{js,ts}', {
    cwd: FIXTURE_BASE_CWD,
    onlyFiles: true,
  })
  const eslint = new ESLint({
    cwd: FIXTURE_BASE_CWD,
    ignore: false,
    overrideConfigFile: true,
    overrideConfig: [
      // recommended config with useConfig disabled to avoid
      // inheriting root .oxfmtrc.jsonc ignorePatterns
      {
        ...pluginOxfmt.configs.recommended,
        files: ['**/*.{js,ts}'],
        rules: {
          'oxfmt/oxfmt': ['error', { useConfig: false }],
        },
      },
    ],
  })

  const results = await lintFixtureFiles(eslint, FIXTURE_BASE_CWD, files)
  const resultsByPath = mapResultsByFilePath(results)

  expect(results.length).toBe(files.length)
  files.forEach(file => {
    const result = resultsByPath.get(resolvePackagePath(FIXTURE_BASE_CWD, file))
    if (!result) {
      throw new Error(`Missing lint result for fixture file: ${file}`)
    }

    expect(normalizeLintMessagesForSnapshot(result.messages)).toMatchSnapshot(
      file,
    )
  })
})

it('should respect ignorePatterns from .oxfmtrc when useConfig is true', async () => {
  const files = (
    await glob('**/*.js', {
      cwd: FIXTURE_USE_CONFIG_CWD,
      onlyFiles: true,
    })
  ).sort()
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

  const results = await lintFixtureFiles(eslint, FIXTURE_USE_CONFIG_CWD, files)
  const resultsByPath = mapResultsByFilePath(results)

  files.forEach(file => {
    const result = resultsByPath.get(
      resolvePackagePath(FIXTURE_USE_CONFIG_CWD, file),
    )
    if (!result) {
      throw new Error(`Missing lint result for fixture file: ${file}`)
    }

    expect(normalizeLintMessagesForSnapshot(result.messages)).toMatchSnapshot(
      file,
    )
  })
})

it('should prioritize rule ignorePatterns over .oxfmtrc ignorePatterns', async () => {
  const files = (
    await glob('**/*.js', {
      cwd: FIXTURE_USE_CONFIG_CWD,
      onlyFiles: true,
    })
  ).sort()
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

  const results = await lintFixtureFiles(eslint, FIXTURE_USE_CONFIG_CWD, files)
  const resultsByPath = mapResultsByFilePath(results)

  files.forEach(file => {
    const result = resultsByPath.get(
      resolvePackagePath(FIXTURE_USE_CONFIG_CWD, file),
    )
    if (!result) {
      throw new Error(`Missing lint result for fixture file: ${file}`)
    }

    expect(normalizeLintMessagesForSnapshot(result.messages)).toMatchSnapshot(
      file,
    )
  })
})
