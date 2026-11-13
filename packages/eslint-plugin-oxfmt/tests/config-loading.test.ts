import { relative } from 'node:path'
import { expect, it } from 'vitest'
import { FIXTURE_CONFIG_LOADING_CWD, runFixture } from './helpers/fixtures'
import { resolvePackagePath } from './helpers/paths'

const CONFIG_LOADER_FIXTURES = [
  {
    cwd: resolvePackagePath('tests/fixtures/config-loading/json'),
    title: 'should load .oxfmtrc.json',
  },
  {
    cwd: resolvePackagePath('tests/fixtures/config-loading/jsonc'),
    title: 'should load .oxfmtrc.jsonc',
  },
  {
    title: 'should load .oxfmtrc.jsonc with trailing comma',
    cwd: resolvePackagePath(
      'tests/fixtures/config-loading/jsonc-trailing-comma',
    ),
  },
  {
    cwd: resolvePackagePath('tests/fixtures/config-loading/jsonc-empty'),
    title: 'should load empty .oxfmtrc.jsonc',
  },
  {
    cwd: resolvePackagePath('tests/fixtures/config-loading/ts-config'),
    title: 'should load oxfmt.config.ts',
  },
  {
    cwd: resolvePackagePath('tests/fixtures/config-loading/mts-config'),
    title: 'should load oxfmt.config.mts',
  },
  {
    title: 'should merge .editorconfig with .oxfmtrc.json',
    cwd: resolvePackagePath(
      'tests/fixtures/config-loading/json-with-editorconfig',
    ),
  },
  {
    title: 'should merge .editorconfig with .oxfmtrc.jsonc',
    cwd: resolvePackagePath(
      'tests/fixtures/config-loading/jsonc-with-editorconfig',
    ),
  },
  {
    title: 'should merge .editorconfig with oxfmt.config.ts',
    cwd: resolvePackagePath(
      'tests/fixtures/config-loading/ts-with-editorconfig',
    ),
  },
  {
    cwd: resolvePackagePath(
      'tests/fixtures/config-loading/editorconfig-sections',
    ),
    title:
      'should apply .editorconfig sections and keep oxfmt overrides higher priority',
  },
  {
    title: 'should resolve nearest .editorconfig per file path',
    cwd: resolvePackagePath(
      'tests/fixtures/config-loading/nearest-editorconfig',
    ),
  },
  {
    cwd: resolvePackagePath('tests/fixtures/config-loading/config-priority'),
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
    const cwd = resolvePackagePath(
      'tests/fixtures/config-loading/config-path-explicit',
    )
    const summary = await runFixture(cwd, { configPath })

    expect(summary).toHaveLength(1)
    expect(summary[0]?.file).toBe('src/example.js')
    expect(summary[0]?.messages.length).toBeGreaterThan(0)
    expect(summary[0]?.output).toBe(CONFIG_PATH_EXPECTED_OUTPUT)
  })
})
