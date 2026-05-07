import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { ESLint } from 'eslint'
import { createSyncFn } from 'synckit'
import { expect, it } from 'vitest'
import { resolve } from '../scripts/utils'
import pluginOxfmt, { parserPlain } from '../src'
import { dirWorkers } from '../src/dir'
import type { RuleOxfmtOptions, WorkerFormatResult } from '../src/types'

const FIXTURE_CWD = resolve('tests/fixtures/cli-parity')
const FIXTURE_NESTED_CWD = resolve('tests/fixtures/cli-parity/nested')
const runWorker = createSyncFn(join(dirWorkers, 'oxfmt.mjs')) as unknown as (
  filename: string,
  sourceText: string,
  options?: RuleOxfmtOptions,
) => WorkerFormatResult

const CLI_PARITY_DEFAULTS: RuleOxfmtOptions = {
  disableNestedConfig: false,
  respectOxfmtDefaultIgnores: true,
  useConfig: true,
  withNodeModules: false,
}

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
    warnIgnored: false,
    overrideConfig: [
      {
        ...pluginOxfmt.configs.cliParity,
        files: ['**/*.{js,ts,json,yaml,yml}'],
        ignores: ['!**/node_modules/**'],
        languageOptions: {
          parser: parserPlain,
        },
        rules: {
          'oxfmt/oxfmt': ['error', { ...CLI_PARITY_DEFAULTS, ...ruleOptions }],
        },
      },
    ],
  })
}

async function lintFile(
  cwd: string,
  file: string,
  options?: RuleOxfmtOptions,
  fix = false,
) {
  const eslint = createEslint(cwd, options, fix)
  const filePath = resolve(cwd, file)
  const sourceText = await readFile(filePath, 'utf8')
  const [result] = await eslint.lintText(sourceText, { filePath })
  return (
    result ?? {
      filePath,
      messages: [],
      suppressedMessages: [],
    }
  )
}

it('should ignore node_modules by default', async () => {
  const result = await lintFile(FIXTURE_CWD, 'node_modules/a.ts')
  expect(result.messages).toHaveLength(0)
})

it('should lint files in node_modules when withNodeModules is true', async () => {
  const filePath = resolve(FIXTURE_CWD, 'node_modules/a.ts')
  const sourceText = await readFile(filePath, 'utf8')
  const result = runWorker(filePath, sourceText, {
    cwd: FIXTURE_CWD,
    respectOxfmtDefaultIgnores: true,
    useConfig: true,
    withNodeModules: true,
  })

  expect(result.ignored).not.toBe(true)
  if (result.ignored) {
    throw new Error(
      'node_modules file should not be ignored when withNodeModules is true',
    )
  }
  expect(result.code).toBe(`export const dep = 'hello';\n`)
})

it('should ignore default lockfiles', async () => {
  const packageLock = await lintFile(FIXTURE_CWD, 'package-lock.json')
  const pnpmLock = await lintFile(FIXTURE_CWD, 'pnpm-lock.yaml')

  expect(packageLock.messages).toHaveLength(0)
  expect(pnpmLock.messages).toHaveLength(0)
})

it('should ignore files matched by .prettierignore', async () => {
  const result = await lintFile(FIXTURE_CWD, 'src/prettierignored.js')
  expect(result.messages).toHaveLength(0)
})

it('should ignore files matched by .gitignore', async () => {
  const result = await lintFile(FIXTURE_CWD, 'src/gitignored.js')
  expect(result.messages).toHaveLength(0)
})

it('should honor ignorePath when provided', async () => {
  const result = await lintFile(FIXTURE_CWD, 'src/ignored-by-custom.js', {
    ignorePath: 'ignores/custom.ignore',
  })
  expect(result.messages).toHaveLength(0)
})

it('should resolve config ignorePatterns relative to the config directory', async () => {
  const ignoredResult = await lintFile(
    FIXTURE_CWD,
    'configs/project/ignored-config/example.ts',
  )
  const normalResult = await lintFile(
    FIXTURE_CWD,
    'configs/project/src/example.ts',
  )

  expect(ignoredResult.messages).toHaveLength(0)
  expect(normalResult.messages.length).toBeGreaterThan(0)
})

it('should prefer nested config by default', async () => {
  const result = await lintFile(
    FIXTURE_NESTED_CWD,
    'packages/a/src/example.ts',
    undefined,
    true,
  )

  expect(result.output).toBe(`export const nested = 'hello';\n`)
})

it('should disable nested config lookup when disableNestedConfig is true', async () => {
  const result = await lintFile(
    FIXTURE_NESTED_CWD,
    'packages/a/src/example.ts',
    {
      disableNestedConfig: true,
    },
    true,
  )

  expect(result.output).toBe(`export const nested = "hello";\n`)
})

it('should skip oxfmt config loading when useConfig is false', async () => {
  const result = await lintFile(
    FIXTURE_CWD,
    'src/unformatted.js',
    {
      useConfig: false,
    },
    true,
  )

  expect(result.output).toBe(`export const root = "hello";\n`)
})
