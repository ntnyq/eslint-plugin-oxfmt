import { spawnSync } from 'node:child_process'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import process from 'node:process'
import { ESLint } from 'eslint'
import { expect, it } from 'vitest'
import pluginOxfmt from '../src'
import { lintText } from './helpers/lint'
import { OXFMT_CLI } from './helpers/paths'
import { withTempProject } from './helpers/project'

const SOURCE = 'export const value="hello"\n'
const SINGLE_QUOTED = "export const value = 'hello';\n"
const DOUBLE_QUOTED = 'export const value = "hello";\n'

it.each([
  { indentation: ' '.repeat(4), properties: 'indent_size = 4' },
  { indentation: '\t', properties: 'indent_style = tab\nindent_size = 4' },
  {
    indentation: ' '.repeat(4),
    properties: 'indent_style = space\nindent_size = 4\ntab_width = 8',
  },
  {
    indentation: ' '.repeat(8),
    properties: 'tab_width = 8\n[*.js]\nindent_size = 4',
  },
  {
    indentation: ' '.repeat(4),
    properties: 'indent_style = space\ntab_width = 8\n[*.js]\nindent_size = 4',
  },
  {
    indentation: ' '.repeat(8),
    properties:
      'quote_type = double\n[*.js]\ntab_width = 8\n[a.*]\nindent_size = 4',
  },
  {
    indentation: ' '.repeat(4),
    properties: 'tab_width = 8\n[*.js]\ntab_width = unset\nindent_size = 4',
  },
])('matches the CLI for $properties', async ({ indentation, properties }) => {
  await withTempProject(async cwd => {
    const filepath = join(cwd, 'a.js')
    const source = 'if (condition) { console.log("hello"); }\n'
    const expected = `if (condition) {\n${indentation}console.log("hello");\n}\n`
    await writeFile(filepath, source)
    await writeFile(join(cwd, '.oxfmtrc.json'), '{}')
    await writeFile(
      join(cwd, '.editorconfig'),
      `root = true\n[*]\n${properties}\n`,
    )

    const output = await lintText(cwd, filepath, source)
    const cli = spawnSync(process.execPath, [OXFMT_CLI, '--write', 'a.js'], {
      cwd,
      encoding: 'utf8',
    })

    expect(cli.status).toBe(0)
    expect(await readFile(filepath, 'utf8')).toBe(expected)
    expect(output).toBe(expected)
  })
})

it.each([
  'indent_size = 260',
  'tab_width = 260',
  'max_line_length = 65546',
  'indent_style = tab\ntab_width = 260\n[*.js]\nindent_size = 4',
])('rejects out-of-range EditorConfig %s like the CLI', async property => {
  await withTempProject(async cwd => {
    const filepath = join(cwd, 'a.js')
    await writeFile(filepath, SOURCE)
    await writeFile(join(cwd, '.oxfmtrc.json'), '{}')
    await writeFile(
      join(cwd, '.editorconfig'),
      `root = true\n[*]\n${property}\n`,
    )
    const eslint = new ESLint({
      cwd,
      fix: true,
      overrideConfig: [pluginOxfmt.configs.recommended],
      overrideConfigFile: true,
    })

    const [result] = await eslint.lintText(SOURCE, { filePath: filepath })
    const cli = spawnSync(process.execPath, [OXFMT_CLI, '--write', 'a.js'], {
      cwd,
      encoding: 'utf8',
    })

    expect(cli.status).toBe(1)
    expect(result.messages).toHaveLength(1)
    expect(result.messages[0]?.message).toContain(
      'Failed to parse configuration',
    )
    expect(result.output).toBeUndefined()
    expect(await readFile(filepath, 'utf8')).toBe(SOURCE)
  })
})

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
  await withTempProject(async cwd => {
    const filepath = join(cwd, file)
    await mkdir(dirname(filepath), { recursive: true })
    await writeFile(filepath, SOURCE)
    await writeFile(join(cwd, configDir, '.oxfmtrc.json'), '{}')
    await writeFile(
      join(cwd, '.editorconfig'),
      `[${section}]\nquote_type = single\n`,
    )

    const output = await lintText(cwd, filepath, SOURCE)
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
  await withTempProject(async cwd => {
    const filepath = join(cwd, 'packages/a/src/a.js')
    await mkdir(dirname(filepath), { recursive: true })
    await writeFile(join(cwd, '.oxfmtrc.json'), '{}')
    await writeFile(join(cwd, '.editorconfig'), '[*]\nquote_type = double\n')
    await writeFile(
      join(cwd, 'packages/a/.editorconfig'),
      '[*.js]\nquote_type = single\n',
    )
    expect(await lintText(cwd, filepath, SOURCE)).toBe(SINGLE_QUOTED)
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
    await withTempProject(async cwd => {
      const filepath = join(cwd, 'src/a.js')
      await mkdir(dirname(filepath))
      await writeFile(filepath, SOURCE)
      await writeFile(join(cwd, '.oxfmtrc.json'), JSON.stringify(config))
      await writeFile(join(cwd, '.editorconfig'), `${sections}\n`)

      const output = await lintText(cwd, filepath, SOURCE)
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
