import { spawnSync } from 'node:child_process'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import process from 'node:process'
import { expect, it } from 'vitest'
import { lintText } from './helpers/lint'
import { OXFMT_CLI } from './helpers/paths'
import { withTempProject } from './helpers/project'
import type { OxfmtRuleOptions } from '../src/types'

const SOURCE = 'export const value="hello"\n'
const DOUBLE_QUOTED = 'export const value = "hello";\n'

it.each([
  { gitignore: '!dist/a.js\n', ignored: true },
  { gitignore: '!dist/\n!dist/a.js\n', ignored: false },
])(
  'matches Git info exclude with gitignore rules $gitignore',
  async ({ gitignore, ignored }) => {
    await withTempProject(async cwd => {
      const filepath = join(cwd, 'dist', 'a.js')
      const git = spawnSync('git', ['init', '--quiet'], {
        cwd,
        encoding: 'utf8',
      })

      expect(git.status).toBe(0)
      await mkdir(dirname(filepath), { recursive: true })
      await writeFile(filepath, SOURCE)
      await writeFile(join(cwd, '.git', 'info', 'exclude'), 'dist/\n')
      await writeFile(join(cwd, '.gitignore'), gitignore)

      const cli = spawnSync(process.execPath, [OXFMT_CLI, '--write', 'dist'], {
        cwd,
        encoding: 'utf8',
      })
      const expected = ignored ? SOURCE : DOUBLE_QUOTED

      expect(cli.status).toBe(ignored ? 2 : 0)
      expect(await readFile(filepath, 'utf8')).toBe(expected)
      expect(await lintText(cwd, filepath, SOURCE)).toBe(expected)
    })
  },
)

it.each(
  [
    'config',
    'inline',
    '.gitignore',
    '.git/info/exclude',
    '.prettierignore',
    'custom.ignore',
  ].flatMap(source =>
    [false, true].flatMap(useCache =>
      ['DIST/a.js', 'dist/a.js'].map(file => ({
        file,
        source,
        useCache,
      })),
    ),
  ),
)(
  'matches CLI case-sensitive $source ignores for $file (cache=$useCache)',
  async ({ file, source, useCache }) => {
    await withTempProject(async cwd => {
      const filepath = join(cwd, file)
      const options: OxfmtRuleOptions = { useCache }

      await mkdir(dirname(filepath), { recursive: true })
      const git = spawnSync('git', ['init', '--quiet'], {
        cwd,
        encoding: 'utf8',
      })

      expect(git.status).toBe(0)
      await writeFile(filepath, SOURCE)
      await writeFile(
        join(cwd, '.oxfmtrc.json'),
        JSON.stringify(
          source === 'config' || source === 'inline'
            ? { ignorePatterns: ['dist/'] }
            : {},
        ),
      )

      if (source === 'inline') {
        options.ignorePatterns = ['dist/']
      } else if (source !== 'config') {
        await writeFile(join(cwd, source), 'dist/\n')
      }

      if (source === 'custom.ignore') {
        options.ignorePath = source
      }

      const args = source === 'custom.ignore' ? ['--ignore-path', source] : []
      // Explicit files bypass Git ignores in the CLI; use directory discovery.
      const cli = spawnSync(
        process.execPath,
        [OXFMT_CLI, ...args, '--write', dirname(file)],
        { cwd, encoding: 'utf8' },
      )
      const expected = file.startsWith('dist/') ? SOURCE : DOUBLE_QUOTED

      expect(cli.status).toBe(expected === SOURCE ? 2 : 0)
      expect(await readFile(filepath, 'utf8')).toBe(expected)
      expect(await lintText(cwd, filepath, SOURCE, options)).toBe(expected)
    })
  },
)

const IGNORE_CASES: {
  expected: string
  name: string
  options: OxfmtRuleOptions
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

it.each(IGNORE_CASES)(
  'honors $name',
  async ({ expected, options, prettierignore }) => {
    await withTempProject(async cwd => {
      await writeFile(
        join(cwd, '.oxfmtrc.json'),
        JSON.stringify({ ignorePatterns: ['**/*.js'] }),
      )

      if (prettierignore) {
        await writeFile(join(cwd, '.prettierignore'), prettierignore)
      }

      expect(await lintText(cwd, join(cwd, 'a.js'), SOURCE, options)).toBe(
        expected,
      )
    })
  },
)

it.each([
  { expected: SOURCE, pattern: 'vendor/', source: 'config' },
  { expected: DOUBLE_QUOTED, pattern: 'vendor/*', source: 'config' },
  { expected: SOURCE, pattern: 'vendor/', source: '.prettierignore' },
  {
    expected: DOUBLE_QUOTED,
    pattern: 'vendor/*',
    source: '.prettierignore',
  },
])(
  'matches CLI child negation after $pattern in $source',
  async ({ expected, pattern, source }) => {
    await withTempProject(async cwd => {
      const file = 'vendor/keep.js'
      const filepath = join(cwd, file)
      const patterns = [pattern, `!${file}`]

      await mkdir(dirname(filepath))
      await writeFile(filepath, SOURCE)
      await writeFile(
        join(cwd, '.oxfmtrc.json'),
        JSON.stringify(source === 'config' ? { ignorePatterns: patterns } : {}),
      )

      if (source === '.prettierignore') {
        await writeFile(join(cwd, '.prettierignore'), patterns.join('\n'))
      }

      const cli = spawnSync(
        process.execPath,
        [OXFMT_CLI, '--stdin-filepath', file],
        { cwd, encoding: 'utf8', input: SOURCE },
      )

      expect(cli.status).toBe(0)
      expect(cli.stdout).toBe(expected)
      expect(await lintText(cwd, filepath, SOURCE)).toBe(expected)
    })
  },
)

it('matches CLI global ignores before loading an invalid nested config', async () => {
  await withTempProject(async cwd => {
    const file = 'vendor/keep.js'
    const filepath = join(cwd, file)

    await mkdir(dirname(filepath))
    await writeFile(filepath, SOURCE)
    await writeFile(join(cwd, '.oxfmtrc.json'), '{}')
    await writeFile(join(cwd, '.prettierignore'), 'vendor/\n')
    await writeFile(join(cwd, 'vendor/.oxfmtrc.json'), '{ invalid json')

    const cli = spawnSync(
      process.execPath,
      [OXFMT_CLI, '--stdin-filepath', file],
      { cwd, encoding: 'utf8', input: SOURCE },
    )

    expect(cli.status).toBe(0)
    expect(cli.stdout).toBe(SOURCE)
    expect(await lintText(cwd, filepath, SOURCE)).toBe(SOURCE)
  })
})
