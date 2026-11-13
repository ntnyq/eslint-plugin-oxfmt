import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { ESLint } from 'eslint'
import { createSyncFn } from 'synckit'
import { expect, it } from 'vitest'
import pluginOxfmt, { parserPlain } from '../src'
import { workersDir } from '../src/worker-path'
import { resolvePackagePath } from './helpers/paths'
import type { OxfmtWorkerOptions, WorkerFormatResult } from '../src/types'

const FIXTURE_CWD = resolvePackagePath('tests/fixtures/cli-parity')
const FIXTURE_NESTED_CWD = resolvePackagePath(
  'tests/fixtures/cli-parity/nested',
)
const FIXTURE_NESTED_INVALID_CWD = resolvePackagePath(
  'tests/fixtures/cli-parity/nested-invalid',
)
const runWorker = createSyncFn<
  (
    filename: string,
    sourceText: string,
    options?: OxfmtWorkerOptions,
  ) => WorkerFormatResult
>(join(workersDir, 'oxfmt.mjs'))

const CLI_PARITY_DEFAULTS: OxfmtWorkerOptions = {
  disableNestedConfig: false,
  respectOxfmtDefaultIgnores: true,
  useConfig: true,
  withNodeModules: false,
}

function createEslint(
  cwd: string,
  ruleOptions?: OxfmtWorkerOptions,
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
  options?: OxfmtWorkerOptions,
  fix = false,
) {
  const eslint = createEslint(cwd, options, fix)
  const filePath = resolvePackagePath(cwd, file)
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
  const filePath = resolvePackagePath(FIXTURE_CWD, 'node_modules/a.ts')
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
    ignorePath: 'custom.ignore',
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

it('should reject config ignorePatterns that escape the config directory', async () => {
  const result = await lintFile(
    FIXTURE_CWD,
    'invalid-ignore-pattern/src/example.ts',
  )

  expect(result.messages).toHaveLength(1)
  expect(result.messages[0]?.message).toContain(
    'Invalid pattern `../src/**` in `ignorePatterns`',
  )
  expect(result.messages[0]?.message).toContain('`..` is not supported')
})

it('should reject invalid config override glob patterns', async () => {
  const result = await lintFile(
    FIXTURE_CWD,
    'invalid-override-pattern/src/example.ts',
  )

  expect(result.messages).toHaveLength(1)
  expect(result.messages[0]?.message).toContain(
    'Invalid glob pattern `src/**/*.{js,ts`',
  )
  expect(result.messages[0]?.message).toContain('Missing closing: "}"')
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

it('should not fail sibling files when another package has invalid nested config', async () => {
  const result = await lintFile(
    FIXTURE_NESTED_INVALID_CWD,
    'packages/b/index.ts',
    undefined,
    true,
  )

  expect(result.messages.some(message => message.fatal)).toBe(false)
  expect(
    result.messages.some(message =>
      message.message.includes('Failed to format file:'),
    ),
  ).toBe(false)
  expect(result.output ?? `export const healthy = "hello"\n`).toBe(
    `export const healthy = "hello";\n`,
  )
})

it('should fail when linting files under package with invalid nested config', async () => {
  const result = await lintFile(
    FIXTURE_NESTED_INVALID_CWD,
    'packages/a/index.ts',
  )

  expect(result.messages.length).toBeGreaterThan(0)
  expect(result.messages[0]?.message).toContain('Failed to format file:')
  expect(result.messages[0]?.message).toMatch(/packages[\\/]+a[\\/]+index\.ts/)
})

it('should not read nested config when disableNestedConfig is true', async () => {
  const result = await lintFile(
    FIXTURE_NESTED_INVALID_CWD,
    'packages/a/index.ts',
    {
      disableNestedConfig: true,
    },
    true,
  )

  expect(result.messages.some(message => message.fatal)).toBe(false)
  expect(result.output).toBe(`export const broken = "hello";\n`)
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

it('should not apply config ignorePatterns when useConfig is false', async () => {
  const result = await lintFile(
    FIXTURE_CWD,
    'configs/project/ignored-config/example.ts',
    {
      useConfig: false,
    },
  )

  expect(result.messages.length).toBeGreaterThan(0)
})

it('should still respect .gitignore when useConfig is false', async () => {
  const result = await lintFile(FIXTURE_CWD, 'src/gitignored.js', {
    useConfig: false,
  })

  expect(result.messages).toHaveLength(0)
})
