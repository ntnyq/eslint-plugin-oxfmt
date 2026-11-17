import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { ESLint } from 'eslint'
import { expect, it } from 'vitest'
import pluginOxfmt from '../src'
import { withTempProject } from './helpers/project'
import { runWorker } from './helpers/worker'

it('accepts useCache in rule options and reloads changed config when disabled', async () => {
  await withTempProject(async cwd => {
    const configPath = join(cwd, '.oxfmtrc.json')
    const eslint = new ESLint({
      cwd,
      fix: true,
      overrideConfigFile: true,
      overrideConfig: [
        {
          ...pluginOxfmt.configs.recommended,
          rules: { 'oxfmt/oxfmt': ['error', { useCache: false }] },
        },
      ],
    })
    const source = 'const value="hello"'

    await writeFile(configPath, '{"singleQuote":true}')
    const [first] = await eslint.lintText(source, {
      filePath: join(cwd, 'a.js'),
    })

    expect(first.messages).toEqual([])
    expect(first.output).toBe("const value = 'hello';\n")
    await writeFile(configPath, '{"singleQuote":false}')
    const [second] = await eslint.lintText(source, {
      filePath: join(cwd, 'a.js'),
    })

    expect(second.messages).toEqual([])
    expect(second.output).toBe('const value = "hello";\n')
  })
})

it.each([true, false])(
  'loads a CommonJS config once per request with useCache=%s',
  async useCache => {
    await withTempProject(async cwd => {
      const counterPath = join(cwd, 'count.txt')
      const configPath = join(cwd, 'config.cjs')

      await writeFile(counterPath, '0')
      await writeFile(
        configPath,
        [
          "const { readFileSync, writeFileSync } = require('node:fs')",
          `const path = ${JSON.stringify(counterPath)}`,
          "writeFileSync(path, String(Number(readFileSync(path, 'utf8')) + 1))",
          'module.exports = { semi: false }',
        ].join('\n'),
      )

      for (const file of ['a.js', 'nested/b.js']) {
        const result = runWorker(join(cwd, file), 'const value=1', {
          configPath,
          cwd,
          useCache,
        })

        expect(result.code).toBe('const value = 1\n')
      }

      expect(await readFile(counterPath, 'utf8')).toBe(useCache ? '1' : '2')
    })
  },
)

it('checks global ignores before loading a broken config with caching disabled', async () => {
  await withTempProject(async cwd => {
    await mkdir(join(cwd, 'vendor'))
    await writeFile(join(cwd, '.prettierignore'), 'vendor/')
    await writeFile(join(cwd, 'vendor/.oxfmtrc.json'), '{invalid')
    const result = runWorker(join(cwd, 'vendor/a.js'), 'const value=1', {
      cwd,
      useCache: false,
    })

    expect(result.ignored).toBe(true)
    expect(result.code).toBe('const value=1')
  })
})

it('does not resolve EditorConfig for files ignored by config patterns', async () => {
  await withTempProject(async cwd => {
    await writeFile(
      join(cwd, '.oxfmtrc.json'),
      '{"ignorePatterns":["generated/**"]}',
    )
    const result = runWorker(join(cwd, 'generated/a.js'), 'const value=1', {
      cwd,
      editorconfig: { cwd: 'invalid\0directory' },
      useCache: false,
    })

    expect(result.ignored).toBe(true)
    expect(result.code).toBe('const value=1')
  })
})

it('formats files outside cwd without passing parent paths to inline ignore matchers', async () => {
  await withTempProject(async cwd => {
    const result = runWorker(join(cwd, '../sibling/a.js'), 'const value=1', {
      cwd,
      ignorePatterns: ['dist/**'],
      respectOxfmtDefaultIgnores: false,
      useConfig: false,
    })

    expect(result.ignored).not.toBe(true)
    expect(result.code).toBe('const value = 1;\n')
  })
})
