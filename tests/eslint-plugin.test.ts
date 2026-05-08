import { readFile } from 'node:fs/promises'
import { relative } from 'node:path'
import { ESLint } from 'eslint'
import * as jsoncParser from 'jsonc-eslint-parser'
import { glob } from 'tinyglobby'
import { expect, it } from 'vitest'
import { resolve } from '../scripts/utils'
import pluginOxfmt from '../src'
import type { Linter } from 'eslint'
import type { RuleOxfmtOptions } from '../src/types'

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

function mapFixtureSummaryByFile(
  summary: Awaited<ReturnType<typeof runFixture>>,
) {
  return new Map(summary.map(result => [result.file, result] as const))
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

it('should work with jsonc-eslint-parser when using recommendedWithoutParser', async () => {
  const jsoncSourceText = normalizeLineEndings(`{
  // a comment only supported by json/jsonc parsers
  "name":"foo",
  "list":[1,2,3,],
}
`)
  const jsoncFilePath = resolve(FIXTURE_BASE_CWD, 'example.jsonc')
  const jsSourceText = normalizeLineEndings(`console.log("hello")\n`)
  const jsFilePath = resolve(FIXTURE_BASE_CWD, 'example.js')

  const baseConfig = [
    {
      ...pluginOxfmt.configs.recommendedWithoutParser,
      files: ['**/*.{js,ts,json,jsonc}'],
      rules: {
        'oxfmt/oxfmt': ['error', { useConfig: false }],
      },
    },
    {
      files: ['**/*.{json,jsonc}'],
      languageOptions: {
        parser: jsoncParser as unknown as Linter.Parser,
      },
    },
  ] satisfies Linter.Config[]

  const lintEslint = new ESLint({
    cwd: FIXTURE_BASE_CWD,
    fix: false,
    ignore: false,
    overrideConfig: baseConfig,
    overrideConfigFile: true,
  })

  const fixedEslint = new ESLint({
    cwd: FIXTURE_BASE_CWD,
    fix: true,
    ignore: false,
    overrideConfig: baseConfig,
    overrideConfigFile: true,
  })

  const [jsoncLintResult] = await lintEslint.lintText(jsoncSourceText, {
    filePath: jsoncFilePath,
  })
  expect(
    jsoncLintResult.messages.some(message => message.ruleId === null),
  ).toBe(false)
  expect(jsoncLintResult.messages.some(message => message.fatal)).toBe(false)

  const [jsLintResult] = await lintEslint.lintText(jsSourceText, {
    filePath: jsFilePath,
  })
  expect(jsLintResult.messages.some(message => message.ruleId === null)).toBe(
    false,
  )
  expect(
    jsLintResult.messages.some(message => message.ruleId === 'oxfmt/oxfmt'),
  ).toBe(true)

  const [fixedJsResult] = await fixedEslint.lintText(jsSourceText, {
    filePath: jsFilePath,
  })
  expect(typeof fixedJsResult.output).toBe('string')
  expect(normalizeLineEndings(fixedJsResult.output ?? '')).not.toBe(
    jsSourceText,
  )
})

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

const CONFIG_LOADER_FIXTURES = [
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
    cwd: resolve('tests/fixtures/config-loading/nearest-editorconfig'),
    title: 'should resolve nearest .editorconfig per file path',
  },
  {
    cwd: resolve('tests/fixtures/config-loading/config-priority'),
    title:
      'should prefer .oxfmtrc.json over .oxfmtrc.jsonc and oxfmt.config.ts',
  },
] as const

CONFIG_LOADER_FIXTURES.forEach(
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

const CONFIG_PATH_FORMAT_CASES = [
  'configs/custom.json',
  'configs/custom.jsonc',
  'configs/custom.ts',
  'configs/custom.mts',
  'configs/custom.js',
  'configs/custom.mjs',
  'configs/custom.cjs',
] as const

const CONFIG_PATH_EXPECTED_OUTPUT = `export function greet() {
  console.log(
    'hello world',
  )
}

format(
  reallyLongArg(),
  anotherLongArg(),
)`

CONFIG_PATH_FORMAT_CASES.forEach(configPath => {
  it(`should load explicit configPath for ${configPath}`, async () => {
    const cwd = resolve('tests/fixtures/config-loading/config-path-explicit')
    const summary = await runFixture(cwd, { configPath })

    expect(summary).toHaveLength(1)
    expect(summary[0]?.file).toBe('src/example.js')
    expect(summary[0]?.messages.length).toBeGreaterThan(0)
    expect(summary[0]?.output).toBe(CONFIG_PATH_EXPECTED_OUTPUT)
  })
})

it('should match config-derived overrides relative to config directory, not ESLint cwd', async () => {
  // ESLint cwd is the parent "nested-config/" directory, but the
  // .oxfmtrc.json lives in "packages/a/". The config's overrides use
  // files: ["src/**/*.ts"] which must be resolved relative to the config
  // directory (packages/a/), not ESLint cwd (nested-config/).
  const parentCwd = resolve('tests/fixtures/config-loading/nested-config')
  const files = (
    await glob('packages/a/src/**/*.{js,ts}', {
      cwd: parentCwd,
      onlyFiles: true,
    })
  ).sort()

  const eslint = createEslint(parentCwd)
  const results = await lintFixtureFiles(eslint, parentCwd, files)
  const resultsByPath = mapResultsByFilePath(results)

  // example.ts should be affected by the override (printWidth: 40)
  const tsResult = resultsByPath.get(
    resolve(parentCwd, 'packages/a/src/example.ts'),
  )
  expect(tsResult).toBeDefined()
  expect(normalizeLintMessagesForSnapshot(tsResult!.messages)).toMatchSnapshot(
    'packages/a/src/example.ts',
  )

  // normal.js should NOT be affected by the override (*.ts only)
  const jsResult = resultsByPath.get(
    resolve(parentCwd, 'packages/a/src/normal.js'),
  )
  expect(jsResult).toBeDefined()
  expect(normalizeLintMessagesForSnapshot(jsResult!.messages)).toMatchSnapshot(
    'packages/a/src/normal.js',
  )
})

it('should merge rule-level overrides when useConfig is true', async () => {
  const cwd = resolve('tests/fixtures/config-loading/rule-overrides-ignored')
  const ruleOptions: RuleOxfmtOptions = {
    useConfig: true,
    overrides: [
      {
        files: ['src/**/*.ts'],
        options: {
          printWidth: 120,
        },
      },
    ],
  }

  const [baselineSummary, conflictingSummary] = await Promise.all([
    runFixture(cwd),
    runFixture(cwd, ruleOptions),
  ])

  expect(baselineSummary).toHaveLength(1)
  expect(baselineSummary[0]?.messages.length).toBeGreaterThan(0)
  expect(conflictingSummary).toHaveLength(1)
  expect(conflictingSummary[0]?.messages.length).toBeGreaterThan(0)
  expect(conflictingSummary[0]?.output).toBe(
    `export function buildUser(name: string) {
  return createUserProfile(name, 'a very long display name');
}
`,
  )
  expect(conflictingSummary).not.toEqual(baselineSummary)
})

it('should match config-derived ignorePatterns relative to config directory, not ESLint cwd', async () => {
  // Same nested-config fixture: .oxfmtrc.json in packages/a/ has
  // ignorePatterns: ["**/ignored/**"]. Files under packages/a/ignored/
  // should be ignored even when ESLint cwd is the parent directory.
  const parentCwd = resolve('tests/fixtures/config-loading/nested-config')
  const files = (
    await glob('packages/a/**/*.{js,ts}', {
      cwd: parentCwd,
      onlyFiles: true,
    })
  ).sort()

  const eslint = createEslint(parentCwd)
  const results = await lintFixtureFiles(eslint, parentCwd, files)
  const resultsByPath = mapResultsByFilePath(results)

  // ignored/skipped.ts should produce no lint messages (ignored by config)
  const ignoredResult = resultsByPath.get(
    resolve(parentCwd, 'packages/a/ignored/skipped.ts'),
  )
  expect(ignoredResult).toBeDefined()
  expect(ignoredResult!.messages).toHaveLength(0)

  // src/example.ts should still produce lint messages (not ignored)
  const srcResult = resultsByPath.get(
    resolve(parentCwd, 'packages/a/src/example.ts'),
  )
  expect(srcResult).toBeDefined()
  expect(srcResult!.messages.length).toBeGreaterThan(0)
})

const EDITORCONFIG_QUOTE_TYPE_ROOT_CASES = [
  {
    expectedOutput: `export const message = 'hello world';`,
    cwd: resolve(
      'tests/fixtures/config-loading/editorconfig-quote-type-root-auto',
    ),
    title:
      'should treat root .editorconfig quote_type=auto as a supported no-op fallback',
  },
  {
    expectedOutput: `export const message = "hello world";`,
    title: 'should map root .editorconfig quote_type=double to double quotes',
    cwd: resolve(
      'tests/fixtures/config-loading/editorconfig-quote-type-root-double',
    ),
  },
  {
    expectedOutput: `export const message = 'hello world';`,
    title: 'should map root .editorconfig quote_type=single to single quotes',
    cwd: resolve(
      'tests/fixtures/config-loading/editorconfig-quote-type-root-single',
    ),
  },
] as const

EDITORCONFIG_QUOTE_TYPE_ROOT_CASES.forEach(
  ({
    cwd,
    expectedOutput,
    title,
  }: (typeof EDITORCONFIG_QUOTE_TYPE_ROOT_CASES)[number]) => {
    it(`${title}`, async () => {
      const summary = await runFixture(cwd)

      expect(summary).toHaveLength(1)
      expect(summary[0]?.messages.length).toBeGreaterThan(0)
      expect(summary[0]?.output).toBe(expectedOutput)
    })
  },
)

it('should map section .editorconfig quote_type values for single, double, and auto', async () => {
  const summary = await runFixture(
    resolve('tests/fixtures/config-loading/editorconfig-quote-type-sections'),
  )
  const summaryByFile = mapFixtureSummaryByFile(summary)

  expect(summaryByFile.get('src/single.js')?.output).toBe(
    `export const message = 'hello world';`,
  )
  expect(summaryByFile.get('src/double.js')?.output).toBe(
    `export const message = "hello world";`,
  )
  expect(summaryByFile.get('src/auto.js')?.output).toBe(
    `export const message = 'hello world';`,
  )

  expect(summaryByFile.get('src/single.js')?.messages.length).toBeGreaterThan(0)
  expect(summaryByFile.get('src/double.js')?.messages.length).toBeGreaterThan(0)
  expect(summaryByFile.get('src/auto.js')?.messages.length).toBeGreaterThan(0)
})

it('should treat .editorconfig [**] sections as overrides instead of root fallback options', async () => {
  const summary = await runFixture(
    resolve('tests/fixtures/config-loading/editorconfig-double-star'),
  )

  expect(summary).toHaveLength(1)
  expect(summary[0]?.messages.length).toBeGreaterThan(0)
  expect(summary[0]?.output).toBe(`export const message = "hello world";`)
})

it('should align section indent_size fallback with oxfmt and keep inherited root indentation', async () => {
  const summary = await runFixture(
    resolve('tests/fixtures/config-loading/editorconfig-sections'),
  )
  const summaryByFile = mapFixtureSummaryByFile(summary)

  expect(summaryByFile.get('src/sectioned.js')?.output)
    .toBe(`export function buildUser(
  name,
) {
  return createUserProfile(
    name,
    'a very long display name',
  );
}`)
})
