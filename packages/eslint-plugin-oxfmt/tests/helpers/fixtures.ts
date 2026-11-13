import { readFile } from 'node:fs/promises'
import { ESLint } from 'eslint'
import { glob } from 'tinyglobby'
import pluginOxfmt from '../../src'
import { resolvePackagePath } from './paths'
import type { Linter } from 'eslint'
import type { OxfmtRuleOptions } from '../../src/types'

export const FIXTURE_BASE_CWD = resolvePackagePath('tests/fixtures/base')
export const FIXTURE_USE_CONFIG_CWD = resolvePackagePath(
  'tests/fixtures/use-config',
)
export const FIXTURE_CONFIG_LOADING_CWD = resolvePackagePath(
  'tests/fixtures/config-loading',
)

export function createEslint(
  cwd: string,
  ruleOptions?: OxfmtRuleOptions,
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

export async function lintFixtureFiles(
  eslint: ESLint,
  cwd: string,
  files: string[],
) {
  const results = await Promise.all(
    files.map(async file => {
      const filePath = resolvePackagePath(cwd, file)
      const sourceText = normalizeLineEndings(await readFile(filePath, 'utf8'))
      const [result] = await eslint.lintText(sourceText, { filePath })
      return result
    }),
  )

  return results
}

export function mapFixtureSummaryByFile(
  summary: Awaited<ReturnType<typeof runFixture>>,
) {
  return new Map(summary.map(result => [result.file, result] as const))
}

export function mapResultsByFilePath(results: ESLint.LintResult[]) {
  return new Map(results.map(result => [result.filePath, result] as const))
}

export function normalizeLineEndings(text: string) {
  return text.replaceAll('\r\n', '\n')
}

export function normalizeLintMessagesForSnapshot(
  messages: Linter.LintMessage[],
) {
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

export async function runFixture(cwd: string, ruleOptions?: OxfmtRuleOptions) {
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
    const filePath = resolvePackagePath(cwd, file)
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
