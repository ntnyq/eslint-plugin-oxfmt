import { platform } from 'node:os'
import { relative } from 'node:path'
import { ESLint } from 'eslint'
import { glob } from 'tinyglobby'
import { expect, it } from 'vitest'
import { resolve } from '../scripts/utils'
import pluginOxfmt from '../src'
import type { OxfmtOxfmt as RuleOxfmtOptions } from '../dts/rule-options'

const IS_SUPPORTED_PLATFORM = platform() === 'darwin' || platform() === 'linux'
const FIXTURE_BASE_CWD = resolve('tests/fixtures/base')
const FIXTURE_USE_CONFIG_CWD = resolve('tests/fixtures/use-config')
const FIXTURE_CONFIG_LOADING_CWD = resolve('tests/fixtures/config-loading')

function createEslint(
  cwd: string,
  ruleOptions?: RuleOxfmtOptions,
  fix = false,
) {
  return new ESLint({
    cwd,
    fix,
    ignore: false,
    overrideConfigFile: true,
    overrideConfig: [
      {
        ...pluginOxfmt.configs.recommended,
        files: ['**/*.{js,ts}'],
        ...(ruleOptions
          ? {
              rules: {
                'oxfmt/oxfmt': ['error', ruleOptions],
              },
            }
          : {}),
      },
    ],
  })
}

async function runFixture(cwd: string, ruleOptions?: RuleOxfmtOptions) {
  const files = (
    await glob(['src/**/*.{js,ts}', 'scripts/**/*.{js,ts}'], {
      cwd,
      onlyFiles: true,
    })
  ).sort()

  const [lintResults, fixedResults] = await Promise.all([
    createEslint(cwd, ruleOptions).lintFiles(files),
    createEslint(cwd, ruleOptions, true).lintFiles(files),
  ])

  const lintResultsByPath = new Map(
    lintResults.map(result => [result.filePath, result] as const),
  )
  const fixedResultsByPath = new Map(
    fixedResults.map(result => [result.filePath, result] as const),
  )

  return files.map(file => {
    const filePath = resolve(cwd, file)
    const lintResult = lintResultsByPath.get(filePath)
    const fixedResult = fixedResultsByPath.get(filePath)

    if (!lintResult || !fixedResult) {
      throw new Error(`Missing lint result for fixture file: ${file}`)
    }

    return {
      file,
      messages: lintResult.messages,
      output:
        fixedResult.output ?? fixedResult.source ?? lintResult.source ?? null,
    }
  })
}

it.runIf(IS_SUPPORTED_PLATFORM)('should lint work', async () => {
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
})

it.runIf(IS_SUPPORTED_PLATFORM)(
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

it.runIf(IS_SUPPORTED_PLATFORM)(
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

const configLoadingFixtures = [
  {
    cwd: resolve('tests/fixtures/config-loading/json'),
    title: 'should load .oxfmtrc.json',
  },
  {
    cwd: resolve('tests/fixtures/config-loading/jsonc'),
    title: 'should load .oxfmtrc.jsonc',
  },
  {
    cwd: resolve('tests/fixtures/config-loading/ts-config'),
    title: 'should load oxfmt.config.ts',
  },
  {
    cwd: resolve('tests/fixtures/config-loading/json-with-editorconfig'),
    title: 'should merge .editorconfig with .oxfmtrc.json',
  },
  {
    cwd: resolve('tests/fixtures/config-loading/jsonc-with-editorconfig'),
    title: 'should merge .editorconfig with .oxfmtrc.jsonc',
  },
  {
    cwd: resolve('tests/fixtures/config-loading/ts-with-editorconfig'),
    title: 'should merge .editorconfig with oxfmt.config.ts',
  },
  {
    cwd: resolve('tests/fixtures/config-loading/editorconfig-sections'),
    title:
      'should apply .editorconfig sections and keep oxfmt overrides higher priority',
  },
  {
    cwd: resolve('tests/fixtures/config-loading/config-priority'),
    title:
      'should prefer .oxfmtrc.json over .oxfmtrc.jsonc and oxfmt.config.ts',
  },
] as const

configLoadingFixtures.forEach(
  ({ cwd, title }: { cwd: string; title: string }) => {
    it.runIf(IS_SUPPORTED_PLATFORM)(`${title}`, async () => {
      const summary = await runFixture(cwd)

      expect({
        fixture: relative(FIXTURE_CONFIG_LOADING_CWD, cwd),
        summary,
      }).toMatchSnapshot()
    })
  },
)
