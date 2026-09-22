import { spawnSync } from 'node:child_process'
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import process from 'node:process'
import { ESLint } from 'eslint'
import { expect, it } from 'vitest'
import { resolve } from '../scripts/utils'
import pluginOxfmt from '../src'
import type { OxfmtOxfmt } from '../dts/rule-options'

type RuleOptions = NonNullable<OxfmtOxfmt[0]>

const SOURCE = 'export const value="hello"\n'
const SINGLE_QUOTED = "export const value = 'hello';\n"
const DOUBLE_QUOTED = 'export const value = "hello";\n'
const OXFMT_CLI = resolve('node_modules/oxfmt/bin/oxfmt')

const IGNORE_CASES: {
  expected: string
  name: string
  options: RuleOptions
  prettierignore?: string
}[] = [
  { expected: SOURCE, name: 'config patterns by default', options: {} },
  {
    expected: SOURCE,
    name: 'config patterns with defaults disabled',
    options: { respectOxfmtDefaultIgnores: false },
  },
  {
    expected: DOUBLE_QUOTED,
    name: 'empty inline patterns',
    options: { ignorePatterns: [] },
  },
  {
    expected: DOUBLE_QUOTED,
    name: 'nonmatching inline patterns',
    options: { ignorePatterns: ['other/**'] },
  },
  {
    expected: SOURCE,
    name: 'matching inline patterns',
    options: { ignorePatterns: ['**/*.js'] },
  },
  {
    expected: SOURCE,
    name: 'global ignores despite empty inline patterns',
    options: { ignorePatterns: [] },
    prettierignore: '*.js',
  },
  {
    expected: DOUBLE_QUOTED,
    name: 'disabled global ignores and empty inline patterns',
    options: { ignorePatterns: [], respectOxfmtDefaultIgnores: false },
    prettierignore: '*.js',
  },
  {
    expected: DOUBLE_QUOTED,
    name: 'disabled config loading',
    options: { useConfig: false },
  },
  {
    expected: SOURCE,
    name: 'global ignores with disabled config loading',
    options: { useConfig: false },
    prettierignore: '*.js',
  },
]

async function lint(cwd: string, filepath: string, options: RuleOptions = {}) {
  const eslint = new ESLint({
    cwd,
    fix: true,
    overrideConfigFile: true,
    overrideConfig: [
      {
        ...pluginOxfmt.configs.recommended,
        rules: { 'oxfmt/oxfmt': ['error', options] },
      },
    ],
  })
  const [result] = await eslint.lintText(SOURCE, { filePath: filepath })
  expect(result.messages).toEqual([])
  return result.output ?? SOURCE
}

async function withProject(run: (cwd: string) => Promise<void>) {
  const cwd = await mkdtemp(join(tmpdir(), 'oxfmt-config-regression-'))
  try {
    await run(cwd)
  } finally {
    await rm(cwd, { force: true, recursive: true })
  }
}

it.each([
  { file: 'a.js', name: 'basename at root', section: '*.js' },
  { file: 'src/a.js', name: 'basename in a subdirectory', section: '*.js' },
  {
    file: 'src/.hidden/deep/a.js',
    name: 'basename in a deep dot directory',
    section: '*.js',
  },
  { file: 'src/a.js', name: 'explicit recursive pattern', section: '**/*.js' },
  {
    configDir: 'packages/a',
    file: 'packages/a/src/a.js',
    name: 'ancestor EditorConfig with nested config',
    section: '**/*.js',
  },
  {
    configDir: 'packages/a',
    file: 'packages/a/src/a.js',
    name: 'ancestor scoped pattern with nested config',
    section: 'packages/a/src/*.js',
  },
])('matches the CLI for $name', async ({ configDir = '.', file, section }) => {
  await withProject(async cwd => {
    const filepath = join(cwd, file)
    await mkdir(dirname(filepath), { recursive: true })
    await writeFile(filepath, SOURCE)
    await writeFile(join(cwd, configDir, '.oxfmtrc.json'), '{}')
    await writeFile(
      join(cwd, '.editorconfig'),
      `[${section}]\nquote_type = single\n`,
    )

    const output = await lint(cwd, filepath)
    const cli = spawnSync(process.execPath, [OXFMT_CLI, '--write', file], {
      cwd,
      encoding: 'utf8',
    })
    expect(cli.status).toBe(0)
    expect(await readFile(filepath, 'utf8')).toBe(SINGLE_QUOTED)
    expect(output).toBe(SINGLE_QUOTED)
  })
})

it('keeps nearest per-file EditorConfig lookup with a root oxfmt config', async () => {
  await withProject(async cwd => {
    const filepath = join(cwd, 'packages/a/src/a.js')
    await mkdir(dirname(filepath), { recursive: true })
    await writeFile(join(cwd, '.oxfmtrc.json'), '{}')
    await writeFile(join(cwd, '.editorconfig'), '[*]\nquote_type = double\n')
    await writeFile(
      join(cwd, 'packages/a/.editorconfig'),
      '[*.js]\nquote_type = single\n',
    )
    expect(await lint(cwd, filepath)).toBe(SINGLE_QUOTED)
  })
})

it.each([
  {
    expected: SINGLE_QUOTED,
    name: 'global first',
    sections: '[*]\nquote_type = double\n[**/*.js]\nquote_type = single',
  },
  {
    expected: DOUBLE_QUOTED,
    name: 'global last',
    sections: '[**/*.js]\nquote_type = single\n[*]\nquote_type = double',
  },
  {
    config: { singleQuote: false },
    expected: DOUBLE_QUOTED,
    name: 'explicit root config',
    sections: '[**/*.js]\nquote_type = single\n[*]\nquote_type = single',
  },
  {
    expected: DOUBLE_QUOTED,
    name: 'explicit config override',
    sections: '[**/*.js]\nquote_type = single\n[*]\nquote_type = single',
    config: {
      overrides: [{ files: ['src/*.js'], options: { singleQuote: false } }],
    },
  },
])(
  'preserves precedence with $name',
  async ({ config = {}, expected, sections }) => {
    await withProject(async cwd => {
      const filepath = join(cwd, 'src/a.js')
      await mkdir(dirname(filepath))
      await writeFile(filepath, SOURCE)
      await writeFile(join(cwd, '.oxfmtrc.json'), JSON.stringify(config))
      await writeFile(join(cwd, '.editorconfig'), `${sections}\n`)

      const output = await lint(cwd, filepath)
      const cli = spawnSync(
        process.execPath,
        [OXFMT_CLI, '--write', 'src/a.js'],
        { cwd, encoding: 'utf8' },
      )
      expect(cli.status).toBe(0)
      expect(await readFile(filepath, 'utf8')).toBe(expected)
      expect(output).toBe(expected)
    })
  },
)

it.each(IGNORE_CASES)(
  'honors $name',
  async ({ expected, options, prettierignore }) => {
    await withProject(async cwd => {
      await writeFile(
        join(cwd, '.oxfmtrc.json'),
        JSON.stringify({ ignorePatterns: ['**/*.js'] }),
      )
      if (prettierignore) {
        await writeFile(join(cwd, '.prettierignore'), prettierignore)
      }
      expect(await lint(cwd, join(cwd, 'a.js'), options)).toBe(expected)
    })
  },
)
