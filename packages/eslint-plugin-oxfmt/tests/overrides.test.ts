import { readFile } from 'node:fs/promises'
import { ESLint } from 'eslint'
import { glob } from 'tinyglobby'
import { expect, it } from 'vitest'
import pluginOxfmt from '../src'
import {
  createEslint,
  lintFixtureFiles,
  mapResultsByFilePath,
  normalizeLineEndings,
  normalizeLintMessagesForSnapshot,
  runFixture,
} from './helpers/fixtures'
import { resolvePackagePath } from './helpers/paths'
import type { OxfmtRuleOptions } from '../src/types'

it('should match config-derived overrides relative to config directory, not ESLint cwd', async () => {
  // ESLint cwd is the parent "nested-config/" directory, but the
  // .oxfmtrc.json lives in "packages/a/". The config's overrides use
  // files: ["src/**/*.ts"] which must be resolved relative to the config
  // directory (packages/a/), not ESLint cwd (nested-config/).
  const parentCwd = resolvePackagePath(
    'tests/fixtures/config-loading/nested-config',
  )
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
    resolvePackagePath(parentCwd, 'packages/a/src/example.ts'),
  )
  expect(tsResult).toBeDefined()
  expect(normalizeLintMessagesForSnapshot(tsResult!.messages)).toMatchSnapshot(
    'packages/a/src/example.ts',
  )

  // normal.js should NOT be affected by the override (*.ts only)
  const jsResult = resultsByPath.get(
    resolvePackagePath(parentCwd, 'packages/a/src/normal.js'),
  )
  expect(jsResult).toBeDefined()
  expect(normalizeLintMessagesForSnapshot(jsResult!.messages)).toMatchSnapshot(
    'packages/a/src/normal.js',
  )
})

it('should match config-derived overrides through dot directories', async () => {
  const cwd = resolvePackagePath(
    'tests/fixtures/config-loading/dot-directory-overrides',
  )
  const filePath = resolvePackagePath(cwd, 'docs/.vitepress/theme/app.css')
  const sourceText = normalizeLineEndings(await readFile(filePath, 'utf8'))
  const eslint = new ESLint({
    cwd,
    fix: true,
    ignore: false,
    overrideConfigFile: true,
    overrideConfig: [
      {
        ...pluginOxfmt.configs.recommended,
        files: ['**/*.css'],
      },
    ],
  })

  const [result] = await eslint.lintText(sourceText, { filePath })

  expect(normalizeLineEndings(result.output ?? '')).toBe(`.app {
  font-family: "Inter";
  content: "docs";
}
`)
})

it('should merge rule-level overrides when useConfig is true', async () => {
  const cwd = resolvePackagePath(
    'tests/fixtures/config-loading/rule-overrides-ignored',
  )
  const ruleOptions: OxfmtRuleOptions = {
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
  const parentCwd = resolvePackagePath(
    'tests/fixtures/config-loading/nested-config',
  )
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
    resolvePackagePath(parentCwd, 'packages/a/ignored/skipped.ts'),
  )
  expect(ignoredResult).toBeDefined()
  expect(ignoredResult!.messages).toHaveLength(0)

  // src/example.ts should still produce lint messages (not ignored)
  const srcResult = resultsByPath.get(
    resolvePackagePath(parentCwd, 'packages/a/src/example.ts'),
  )
  expect(srcResult).toBeDefined()
  expect(srcResult!.messages.length).toBeGreaterThan(0)
})
