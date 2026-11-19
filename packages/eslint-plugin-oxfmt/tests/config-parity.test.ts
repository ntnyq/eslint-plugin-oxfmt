import { spawnSync } from 'node:child_process'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { basename, dirname, join } from 'node:path'
import process from 'node:process'
import { ESLint } from 'eslint'
import { expect, it } from 'vitest'
import pluginOxfmt from '../src'
import { lintText } from './helpers/lint'
import { OXFMT_CLI } from './helpers/paths'
import { withTempProject } from './helpers/project'
import type { OxfmtConfig } from 'oxfmt'

const SOURCE = 'export const value="hello"\n'
const SINGLE_QUOTED = "export const value = 'hello';\n"

it.each([
  { cliMatches: false, file: 'a1.js', pluginMatches: true },
  { cliMatches: true, file: 'ad].js', pluginMatches: false },
])(
  'documents the known CLI POSIX character class difference for $file',
  async ({ cliMatches, file, pluginMatches }) => {
    await withTempProject(async cwd => {
      await writeFile(
        join(cwd, '.oxfmtrc.json'),
        JSON.stringify({
          overrides: [
            { files: ['a[[:digit:]].js'], options: { singleQuote: true } },
          ],
        }),
      )
      const cli = spawnSync(
        process.execPath,
        [OXFMT_CLI, '--stdin-filepath', file],
        { cwd, encoding: 'utf8', input: SOURCE },
      )
      const doubleQuoted = 'export const value = "hello";\n'

      expect(cli.status).toBe(0)
      expect(cli.stdout).toBe(cliMatches ? SINGLE_QUOTED : doubleQuoted)
      expect(await lintText(cwd, join(cwd, file), SOURCE)).toBe(
        pluginMatches ? SINGLE_QUOTED : doubleQuoted,
      )
    })
  },
)

it.each([
  { file: 'src/a.js', matches: true, pattern: '*.js' },
  { file: 'src/.hidden/a.js', matches: true, pattern: '*.js' },
  { file: 'src/a.js', matches: false, pattern: './*.js' },
  { file: 'a.js', matches: true, pattern: './*.js' },
  { file: 'src/a.js', matches: true, pattern: './src/*.js' },
  { file: 'a.js', matches: false, pattern: '!keep.js' },
  { file: '!keep.js', matches: true, pattern: '!keep.js' },
  { file: 'a.js', matches: false, pattern: '!(*.test).js' },
  { file: 'ac.js', matches: true, pattern: 'a[!b].js' },
  { file: 'ab.js', matches: false, pattern: 'a[!b].js' },
  { file: 'file2.js', matches: false, pattern: 'file{1..3}.js' },
  { file: 'file1..3.js', matches: true, pattern: 'file{1..3}.js' },
  { file: 'fileone.js', matches: true, pattern: 'file{one}.js' },
  { file: 'fileone.js', matches: true, pattern: 'file{one,{two,three}}.js' },
  { file: 'filethree.js', matches: true, pattern: 'file{one,{two,three}}.js' },
  { file: 'file1..3.js', matches: true, pattern: 'file{1..3,x}.js' },
  { file: 'filex.js', matches: true, pattern: 'file{1..3,x}.js' },
  { file: 'foobar.js', matches: false, pattern: 'foo(bar).js' },
  { file: 'foo(bar).js', matches: true, pattern: 'foo(bar).js' },
  { file: 'src/a.js', matches: false, pattern: './**.js' },
  { file: 'a.js', matches: true, pattern: './**.js' },
  { file: 'a1.js', matches: true, pattern: 'a[0-9].js' },
  { file: 'ad.js', matches: false, pattern: 'a[0-9].js' },
])(
  'matches CLI override glob $pattern against $file',
  async ({ file, matches, pattern }) => {
    await withTempProject(async cwd => {
      await writeFile(
        join(cwd, '.oxfmtrc.json'),
        JSON.stringify({
          overrides: [{ files: [pattern], options: { singleQuote: true } }],
        }),
      )
      const filepath = join(cwd, file)

      await mkdir(dirname(filepath), { recursive: true })
      await writeFile(filepath, SOURCE)
      const cli = spawnSync(process.execPath, [OXFMT_CLI, '--write', file], {
        cwd,
        encoding: 'utf8',
      })
      const expected = matches
        ? SINGLE_QUOTED
        : 'export const value = "hello";\n'

      expect(cli.status).toBe(0)
      expect(await readFile(filepath, 'utf8')).toBe(expected)
      expect(await lintText(cwd, filepath, SOURCE)).toBe(expected)
    })
  },
)

it.each([
  { file: 'src/a.js', matches: true, pattern: '*.js' },
  { file: 'src/a.js', matches: false, pattern: './src/*.js' },
  { file: 'src/a.js', matches: false, pattern: '../src/*.js' },
  { file: 'src/a.js', matches: true, pattern: '**/<project>/src/*.js' },
  {
    exclude: '**/<project>/src/*.js',
    file: 'src/a.js',
    matches: false,
    pattern: '*.js',
  },
  { file: 'config/src/a.js', matches: true, pattern: './src/*.js' },
  { file: 'config/src/a.js', matches: false, pattern: '**/config/src/*.js' },
])(
  'matches CLI override $pattern for $file with an explicit config',
  async ({ exclude, file, matches, pattern }) => {
    await withTempProject(async cwd => {
      const configPath = join('config', 'oxfmt.json')
      const filepath = join(cwd, file)
      const project = basename(cwd)

      await mkdir(join(cwd, 'config'))
      await mkdir(dirname(filepath), { recursive: true })
      await writeFile(
        join(cwd, configPath),
        JSON.stringify({
          overrides: [
            {
              files: [pattern.replace('<project>', () => project)],
              options: { singleQuote: true },
              excludeFiles: exclude && [
                exclude.replace('<project>', () => project),
              ],
            },
          ],
        }),
      )
      await writeFile(filepath, SOURCE)

      const cli = spawnSync(
        process.execPath,
        [OXFMT_CLI, '--config', configPath, '--write', file],
        { cwd, encoding: 'utf8' },
      )
      const expected = matches
        ? SINGLE_QUOTED
        : 'export const value = "hello";\n'

      expect(cli.status).toBe(0)
      expect(await readFile(filepath, 'utf8')).toBe(expected)
      expect(await lintText(cwd, filepath, SOURCE, { configPath })).toBe(
        expected,
      )
    })
  },
)

it.each([
  { descending: true, value: { ignoreCase: false } },
  { descending: true, value: {} },
  { descending: false, value: true },
  { descending: true, value: false },
] satisfies { descending: boolean; value: OxfmtConfig['sortImports'] }[])(
  'matches CLI nested option inheritance for sortImports=$value',
  async ({ descending, value }) => {
    await withTempProject(async cwd => {
      const source = 'import z from "z";\nimport a from "a";\n'
      const expected = descending
        ? source
        : 'import a from "a";\nimport z from "z";\n'

      await writeFile(
        join(cwd, '.oxfmtrc.json'),
        JSON.stringify({
          overrides: [{ files: ['a.js'], options: { sortImports: value } }],
          sortImports: { order: 'desc' },
        }),
      )
      const cli = spawnSync(
        process.execPath,
        [OXFMT_CLI, '--stdin-filepath', 'a.js'],
        { cwd, encoding: 'utf8', input: source },
      )

      expect(cli.status).toBe(0)
      expect(cli.stdout).toBe(expected)
      expect(await lintText(cwd, join(cwd, 'a.js'), source)).toBe(expected)
    })
  },
)

it.each(
  [
    {},
    [null],
    [{}],
    [{ files: '*.js' }],
    [{ files: [1] }],
    [{ excludeFiles: '*.test.js', files: ['other.js'] }],
    [{ files: ['other.js'], options: false }],
  ].map(overrides => ({
    overrides,
  })),
)(
  'rejects malformed external overrides $overrides like the CLI',
  async ({ overrides }) => {
    await withTempProject(async cwd => {
      const configPath = join(cwd, '.oxfmtrc.json')

      await writeFile(configPath, JSON.stringify({ overrides }))
      const cli = spawnSync(
        process.execPath,
        [OXFMT_CLI, '--stdin-filepath', 'a.js'],
        { cwd, encoding: 'utf8', input: SOURCE },
      )
      const eslint = new ESLint({
        cwd,
        fix: true,
        overrideConfig: [pluginOxfmt.configs.recommended],
        overrideConfigFile: true,
      })
      const [result] = await eslint.lintText(SOURCE, {
        filePath: join(cwd, 'a.js'),
      })

      expect(cli.status).toBe(1)
      expect(result.output).toBeUndefined()
      expect(result.messages).toHaveLength(1)
      expect(result.messages[0]?.message).toContain(configPath)
      expect(result.messages[0]?.message).toContain('overrides')
    })
  },
)

it.each(
  [null, [], [{ files: [] }], [{ files: ['other.js'] }]].map(overrides => ({
    overrides,
  })),
)(
  'accepts empty or omitted override options $overrides like the CLI',
  async ({ overrides }) => {
    await withTempProject(async cwd => {
      await writeFile(join(cwd, '.oxfmtrc.json'), JSON.stringify({ overrides }))
      const cli = spawnSync(
        process.execPath,
        [OXFMT_CLI, '--stdin-filepath', 'a.js'],
        { cwd, encoding: 'utf8', input: SOURCE },
      )

      expect(cli.status).toBe(0)
      expect(cli.stdout).toBe('export const value = "hello";\n')
      expect(await lintText(cwd, join(cwd, 'a.js'), SOURCE)).toBe(cli.stdout)
    })
  },
)

it('preserves nested fields across overrides, replaces arrays, and isolates sibling config', async () => {
  await withTempProject(async cwd => {
    const source =
      'import z from "z";\nimport a from "a";\nimport fs from "node:fs";\n'
    const expected =
      'import fs from "node:fs";\nimport z from "z";\nimport a from "a";\n'
    const siblingExpected =
      'import z from "z";\nimport a from "a";\n\nimport fs from "node:fs";\n'

    await writeFile(
      join(cwd, '.oxfmtrc.json'),
      JSON.stringify({
        sortImports: { groups: ['external', 'builtin'], order: 'desc' },
        overrides: [
          {
            files: ['a.js'],
            options: {
              sortImports: {
                groups: ['builtin', 'external'],
                ignoreCase: false,
              },
            },
          },
          {
            files: ['a.js'],
            options: { sortImports: { newlinesBetween: false } },
          },
        ],
      }),
    )

    for (const [file, output] of [
      ['a.js', expected],
      ['b.js', siblingExpected],
      ['a.js', expected],
    ]) {
      const cli = spawnSync(
        process.execPath,
        [OXFMT_CLI, '--stdin-filepath', file],
        { cwd, encoding: 'utf8', input: source },
      )

      expect(cli.status).toBe(0)
      expect(cli.stdout).toBe(output)
      expect(await lintText(cwd, join(cwd, file), source)).toBe(output)
    }
  })
})

it.each(['.oxfmtrc.json', '.oxfmtrc.jsonc'])(
  'matches the CLI for BOM-prefixed %s',
  async filename => {
    await withTempProject(async cwd => {
      const filepath = join(cwd, 'a.js')

      await writeFile(filepath, SOURCE)
      await writeFile(join(cwd, filename), '\u{FEFF}{"singleQuote": true}')

      const output = await lintText(cwd, filepath, SOURCE)
      const cli = spawnSync(process.execPath, [OXFMT_CLI, '--write', 'a.js'], {
        cwd,
        encoding: 'utf8',
      })

      expect(cli.status).toBe(0)
      expect(await readFile(filepath, 'utf8')).toBe(SINGLE_QUOTED)
      expect(output).toBe(SINGLE_QUOTED)
    })
  },
)
