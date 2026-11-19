import { spawnSync } from 'node:child_process'
import { mkdir, symlink, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import process from 'node:process'
import { ESLint } from 'eslint'
import { expect, it } from 'vitest'
import pluginOxfmt from '../src'
import { OXFMT_CLI } from './helpers/paths'
import { withTempProject } from './helpers/project'
import type { OxfmtConfig } from 'oxfmt'
import type { OxfmtOxfmt } from '../dts/rule-options'

type RuleOptions = NonNullable<OxfmtOxfmt[0]>

const SOURCE = '{"z":1,"a":2}'
const CONFIG: OxfmtConfig = {
  overrides: [{ files: ['src/*.conf'], options: { tabWidth: 4 } }],
  associations: [
    { files: ['**/*.conf'], language: 'json' },
    {
      excludeFiles: ['src/keep.conf'],
      files: ['src/**/*.conf'],
      language: 'jsonc',
    },
  ],
}

it.each(
  [
    { file: 'src/a.js', matches: false, pattern: './**.js' },
    { file: 'a.js', matches: true, pattern: './**.js' },
  ].flatMap(testCase =>
    (['files', 'excludeFiles'] as const).map(field => ({
      ...testCase,
      field,
    })),
  ),
)(
  'matches CLI association $field glob $pattern against $file',
  async ({ field, file, matches, pattern }) => {
    await withTempProject(async cwd => {
      const source = '[1,2,3]'
      const associations: OxfmtConfig['associations'] = [
        { files: ['**/*.js'], language: 'typescript' },
        {
          files: field === 'files' ? [pattern] : ['**/*.js'],
          ...(field === 'excludeFiles' ? { excludeFiles: [pattern] } : {}),
          language: 'json',
        },
      ]

      await mkdir(dirname(join(cwd, file)), { recursive: true })
      await writeFile(
        join(cwd, '.oxfmtrc.json'),
        JSON.stringify({ associations }),
      )
      const cli = spawnSync(
        process.execPath,
        [OXFMT_CLI, '--stdin-filepath', file],
        { cwd, encoding: 'utf8', input: source },
      )
      const result = await lint(cwd, file, source)
      const isJson = field === 'files' ? matches : !matches

      expect(cli.status).toBe(0)
      expect(cli.stdout).toBe(isJson ? '[1, 2, 3]\n' : '[1, 2, 3];\n')
      expect(result.messages).toEqual([])
      expect(result.output).toBe(cli.stdout)
    })
  },
)

it.each(['files', 'excludeFiles'] as const)(
  'matches CLI recursive basename patterns in association %s',
  async field => {
    await withTempProject(async cwd => {
      const file = 'src/app.conf'
      const source = field === 'files' ? SOURCE : 'const value:number=1'
      const associations: OxfmtConfig['associations'] =
        field === 'files'
          ? [{ files: ['*.conf'], language: 'json' }]
          : [
              { files: ['**/*.conf'], language: 'typescript' },
              {
                excludeFiles: ['*.conf'],
                files: ['**/*.conf'],
                language: 'json',
              },
            ]

      await mkdir(join(cwd, 'src'))
      await writeFile(
        join(cwd, '.oxfmtrc.json'),
        JSON.stringify({ associations }),
      )
      const cli = spawnSync(
        process.execPath,
        [OXFMT_CLI, '--stdin-filepath', file],
        { cwd, encoding: 'utf8', input: source },
      )
      const result = await lint(cwd, file, source)

      expect(cli.status).toBe(0)
      expect(cli.stdout).toBe(
        field === 'files'
          ? '{ "z": 1, "a": 2 }\n'
          : 'const value: number = 1;\n',
      )
      expect(result.messages).toEqual([])
      expect(result.output).toBe(cli.stdout)
    })
  },
)

async function lint(
  cwd: string,
  file: string,
  source: string,
  options: RuleOptions = {},
) {
  const eslint = new ESLint({
    cwd,
    fix: true,
    overrideConfigFile: true,
    overrideConfig: [
      {
        ...pluginOxfmt.configs.recommended,
        files: [file],
        rules: { 'oxfmt/oxfmt': ['error', options] },
      },
    ],
  })
  const [result] = await eslint.lintText(source, { filePath: join(cwd, file) })

  return result
}

it.each(['files', 'excludeFiles'] as const)(
  'matches CLI association %s patterns outside an explicit config directory',
  async field => {
    await withTempProject(async cwd => {
      const file = 'src/app.conf'
      const configPath = 'configs/custom.json'
      const source = '[1,2,3]'
      const associations: OxfmtConfig['associations'] = [
        { files: ['*.conf'], language: 'javascript' },
        {
          files: ['**/*.conf'],
          ...(field === 'excludeFiles' ? { excludeFiles: ['*.conf'] } : {}),
          language: 'json',
        },
      ]

      await mkdir(join(cwd, 'configs'))
      await mkdir(join(cwd, 'src'))
      await writeFile(join(cwd, configPath), JSON.stringify({ associations }))

      const cli = spawnSync(
        process.execPath,
        [OXFMT_CLI, '-c', configPath, '--stdin-filepath', file],
        { cwd, encoding: 'utf8', input: source },
      )
      const result = await lint(cwd, file, source, { configPath })

      expect(cli.status).toBe(0)
      expect(cli.stdout).toBe(
        field === 'files' ? '[1, 2, 3]\n' : '[1, 2, 3];\n',
      )
      expect(result.messages).toEqual([])
      expect(result.output).toBe(cli.stdout)
    })
  },
)

it.each(['app.conf', 'src/app.conf', 'src/keep.conf', 'src/.hidden/app.conf'])(
  'matches CLI association precedence and original-path overrides for %s',
  async file => {
    await withTempProject(async cwd => {
      await mkdir(dirname(join(cwd, file)), { recursive: true })
      await writeFile(join(cwd, '.oxfmtrc.json'), JSON.stringify(CONFIG))
      const cli = spawnSync(
        process.execPath,
        [OXFMT_CLI, '--stdin-filepath', file],
        { cwd, encoding: 'utf8', input: SOURCE },
      )

      expect(cli.status).toBe(0)
      expect(cli.stdout).not.toBe(SOURCE)
      const result = await lint(cwd, file, SOURCE)

      expect(result.messages).toEqual([])
      expect(result.output).toBe(cli.stdout)
    })
  },
)

it.each([
  {
    file: 'page.html',
    language: 'angular-html',
    source: '@if (user) {\n<p>{{user.name}}</p>\n}',
  },
  {
    file: 'app.component.html',
    language: 'html',
    source: '<p   class="a">{{value}}</p>',
  },
  {
    file: 'card.wxml',
    language: 'html',
    source: '<div><pre>  </pre></div>',
  },
  { file: 'package.json', language: 'json', source: '{"z":1,"a":2}' },
  {
    file: 'example.js',
    language: 'typescript',
    source: 'const value:number=1',
  },
] satisfies {
  file: string
  language: NonNullable<OxfmtConfig['associations']>[number]['language']
  source: string
}[])(
  'matches CLI language selection for $file as $language',
  async ({ file, language, source }) => {
    await withTempProject(async cwd => {
      await writeFile(
        join(cwd, '.oxfmtrc.json'),
        JSON.stringify({
          associations: [{ files: ['**/*'], language }],
        }),
      )
      const cli = spawnSync(
        process.execPath,
        [OXFMT_CLI, '--stdin-filepath', file],
        {
          cwd,
          encoding: 'utf8',
          input: source,
        },
      )

      expect(cli.status).toBe(0)
      const result = await lint(cwd, file, source)

      expect(result.messages).toEqual([])
      expect(result.output ?? source).toBe(cli.stdout)
    })
  },
)

it.each([false, true])(
  'resolves nested associations with explicit config: %s',
  async explicit => {
    await withTempProject(async cwd => {
      await mkdir(join(cwd, 'packages/a/src'), { recursive: true })
      await writeFile(join(cwd, '.oxfmtrc.json'), '{}')
      const configPath = 'packages/a/.oxfmtrc.json'

      await writeFile(join(cwd, configPath), JSON.stringify(CONFIG))
      const file = 'packages/a/src/app.conf'
      const args = explicit ? ['--config', configPath] : []
      const cli = spawnSync(
        process.execPath,
        [OXFMT_CLI, ...args, '--stdin-filepath', file],
        {
          cwd,
          encoding: 'utf8',
          input: SOURCE,
        },
      )

      expect(cli.status).toBe(0)
      const result = await lint(
        cwd,
        file,
        SOURCE,
        explicit ? { configPath } : {},
      )

      expect(result.messages).toEqual([])
      expect(result.output).toBe(cli.stdout)
    })
  },
)

it('matches inline associations from ESLint cwd and replaces config associations', async () => {
  await withTempProject(async cwd => {
    await mkdir(join(cwd, 'packages/a'), { recursive: true })
    await writeFile(
      join(cwd, 'packages/a/.oxfmtrc.json'),
      JSON.stringify(CONFIG),
    )
    const result = await lint(
      cwd,
      'packages/a/app.conf',
      'const value:number=1',
      {
        semi: false,
        associations: [
          { files: ['packages/**/*.conf'], language: 'typescript' },
        ],
      },
    )

    expect(result.messages).toEqual([])
    expect(result.output).toBe('const value: number = 1\n')
  })
})

it('uses inline associations with config loading disabled', async () => {
  await withTempProject(async cwd => {
    await writeFile(join(cwd, '.oxfmtrc.json'), '{invalid')
    const result = await lint(cwd, 'app.conf', SOURCE, {
      associations: [{ files: ['*.conf'], language: 'json' }],
      useConfig: false,
    })

    expect(result.messages).toEqual([])
    expect(result.output).toBe('{ "z": 1, "a": 2 }\n')
  })
})

it.each([
  { associations: [] },
  { useConfig: false },
  { disableNestedConfig: true },
])('does not apply nested config associations with %j', async options => {
  await withTempProject(async cwd => {
    await mkdir(join(cwd, 'nested'))
    await writeFile(join(cwd, '.oxfmtrc.json'), '{}')
    await writeFile(join(cwd, 'nested/.oxfmtrc.json'), JSON.stringify(CONFIG))
    const result = await lint(cwd, 'nested/app.conf', SOURCE, options)

    expect(result.messages[0]?.message).toContain('Unsupported file type:')
    expect(result.output).toBeUndefined()
  })
})

it.each([
  'package-lock.json',
  'pnpm-lock.yaml',
  'yarn.lock',
  'Cargo.lock',
  'mcmod.info',
])(
  'keeps upstream exclusions for associated %s even with default ignores disabled',
  async file => {
    await withTempProject(async cwd => {
      const result = await lint(cwd, file, SOURCE, {
        associations: [{ files: ['**/*'], language: 'json' }],
        respectOxfmtDefaultIgnores: false,
        useConfig: false,
      })

      expect(result.messages).toEqual([])
      expect(result.output).toBeUndefined()
    })
  },
)

it('keeps ignore matching on the original path', async () => {
  await withTempProject(async cwd => {
    await writeFile(
      join(cwd, '.oxfmtrc.json'),
      JSON.stringify({ ...CONFIG, ignorePatterns: ['*.conf'] }),
    )
    const result = await lint(cwd, 'app.conf', SOURCE)

    expect(result.messages).toEqual([])
    expect(result.output).toBeUndefined()
  })
})

it.each([
  [{ files: ['other.conf'], language: 'invalid' }],
  [{ files: ['**/*.{js,ts'], language: 'json' }],
])('reports invalid config associations: %j', async associations => {
  await withTempProject(async cwd => {
    await writeFile(
      join(cwd, '.oxfmtrc.json'),
      JSON.stringify({ associations }),
    )
    const result = await lint(cwd, 'app.conf', SOURCE)

    expect(result.messages[0]?.message).toContain('Failed to format file:')
    expect(result.output).toBeUndefined()
  })
})

it('reports the real filename when an associated plugin is disabled', async () => {
  await withTempProject(async cwd => {
    const result = await lint(cwd, 'app.conf', '<div />', {
      associations: [{ files: ['*.conf'], language: 'astro' }],
      useConfig: false,
    })

    expect(result.messages[0]?.message).toContain(join(cwd, 'app.conf'))
    expect(result.messages[0]?.message).not.toContain('__oxfmt__')
  })
})

it('follows symlinked config discovery and keeps patterns relative to the link', async () => {
  await withTempProject(async cwd => {
    await mkdir(join(cwd, 'shared'))
    await mkdir(join(cwd, 'project/src'), { recursive: true })
    await writeFile(join(cwd, 'shared/config.json'), JSON.stringify(CONFIG))
    await symlink('../shared/config.json', join(cwd, 'project/.oxfmtrc.json'))
    const file = 'project/src/app.conf'
    const cli = spawnSync(
      process.execPath,
      [OXFMT_CLI, '--stdin-filepath', file],
      {
        cwd,
        encoding: 'utf8',
        input: SOURCE,
      },
    )

    expect(cli.status).toBe(0)
    const result = await lint(cwd, file, SOURCE)

    expect(result.messages).toEqual([])
    expect(result.output).toBe(cli.stdout)
  })
})
