import { readFile } from 'node:fs/promises'
import { relative } from 'node:path'
import { ESLint } from 'eslint'
import { glob } from 'tinyglobby'
import { expect, it } from 'vitest'
import { resolve } from '../scripts/utils'
import pluginOxfmt from '../src'
import type { Linter } from 'eslint'
import type { OxfmtOxfmt as RuleOxfmtOptions } from '../dts/rule-options'

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

async function lintFixtureFiles(eslint: ESLint, cwd: string, files: string[]) {
  const results = await Promise.all(
    files.map(async file => {
      const filePath = resolve(cwd, file)
      const sourceText = normalizeLineEndings(await readFile(filePath, 'utf8'))
      const [result] = await eslint.lintText(sourceText, { filePath })
      return result
    }),
  )

  return results
}

function mapResultsByFilePath(results: ESLint.LintResult[]) {
  return new Map(results.map(result => [result.filePath, result] as const))
}

function normalizeLineEndings(text: string) {
  return text.replaceAll('\r\n', '\n')
}

function normalizeLintMessagesForSnapshot(messages: Linter.LintMessage[]) {
  return messages.map(message => {
    const { fix, suggestions, ...rest } = message

    return {
      ...rest,
      ...(fix ? { fix: { text: normalizeLineEndings(fix.text) } } : {}),
      ...(suggestions
        ? {
            suggestions: suggestions.map(suggestion => {
              const { fix: suggestionFix, ...suggestionRest } = suggestion
              return {
                ...suggestionRest,
                ...(suggestionFix
                  ? { fix: { text: normalizeLineEndings(suggestionFix.text) } }
                  : {}),
              }
            }),
          }
        : {}),
    }
  })
}

async function runFixture(cwd: string, ruleOptions?: RuleOxfmtOptions) {
  const files = (
    await glob(['src/**/*.{js,ts}', 'scripts/**/*.{js,ts}'], {
      cwd,
      onlyFiles: true,
    })
  ).sort()

  const lintEslint = createEslint(cwd, ruleOptions)
  const fixedEslint = createEslint(cwd, ruleOptions, true)

  const [lintResults, fixedResults] = await Promise.all([
    lintFixtureFiles(lintEslint, cwd, files),
    lintFixtureFiles(fixedEslint, cwd, files),
  ])

  const lintResultsByPath = mapResultsByFilePath(lintResults)
  const fixedResultsByPath = mapResultsByFilePath(fixedResults)

  return files.map(file => {
    const filePath = resolve(cwd, file)
    const lintResult = lintResultsByPath.get(filePath)
    const fixedResult = fixedResultsByPath.get(filePath)

    if (!lintResult || !fixedResult) {
      throw new Error(`Missing lint result for fixture file: ${file}`)
    }

    return {
      file,
      messages: normalizeLintMessagesForSnapshot(lintResult.messages),
      output:
        normalizeLineEndings(
          fixedResult.output ?? fixedResult.source ?? lintResult.source ?? '',
        ) || null,
    }
  })
}

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
      // recommended config
      {
        ...pluginOxfmt.configs.recommended,
        files: ['**/*.{js,ts}'],
      },
    ],
  })

  const results = await lintFixtureFiles(eslint, FIXTURE_BASE_CWD, files)
  const resultsByPath = mapResultsByFilePath(results)

  expect(results.length).toBe(files.length)
  files.forEach(file => {
    const result = resultsByPath.get(resolve(FIXTURE_BASE_CWD, file))
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
    const result = resultsByPath.get(resolve(FIXTURE_USE_CONFIG_CWD, file))
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
    const result = resultsByPath.get(resolve(FIXTURE_USE_CONFIG_CWD, file))
    if (!result) {
      throw new Error(`Missing lint result for fixture file: ${file}`)
    }

    expect(normalizeLintMessagesForSnapshot(result.messages)).toMatchSnapshot(
      file,
    )
  })
})

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
    it(`${title}`, async () => {
      const summary = await runFixture(cwd)

      expect({
        fixture: relative(FIXTURE_CONFIG_LOADING_CWD, cwd),
        summary,
      }).toMatchSnapshot()
    })
  },
)
