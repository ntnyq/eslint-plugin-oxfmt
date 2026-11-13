import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { expect, it } from 'vitest'
import { createEslint } from './helpers/fixtures'
import { resolvePackagePath } from './helpers/paths'
import type { OxfmtRuleOptions } from '../src/types'

const TAILWIND_PATH_CASES = (['config', 'stylesheet'] as const).flatMap(
  pathOption =>
    (
      [
        'config',
        'config override',
        'explicit configPath',
        'inline',
        'inline override',
        'inline without config',
        'absolute',
      ] as const
    ).map(origin => ({
      origin,
      pathOption,
    })),
)

it.each(TAILWIND_PATH_CASES)(
  'should resolve Tailwind $pathOption paths from $origin',
  async ({ origin, pathOption }) => {
    const cwd = await mkdtemp(resolvePackagePath(tmpdir(), 'oxfmt-tailwind-'))

    try {
      const configDir = resolvePackagePath(cwd, 'packages/app')
      await mkdir(resolvePackagePath(configDir, 'src'), { recursive: true })

      const isInline = origin.startsWith('inline')
      const assetDir = isInline ? cwd : configDir
      const assetName = pathOption === 'config' ? 'theme.cjs' : 'theme.css'
      const assetPath = resolvePackagePath(assetDir, assetName)
      await writeFile(
        assetPath,
        pathOption === 'config'
          ? 'module.exports = { theme: { extend: { colors: { review: "#abc" } } } }'
          : '@theme { --color-review: #abc; --spacing: 0.25rem; }\n@tailwind utilities;\n',
      )

      const tailwindOptions = {
        functions: ['cn'],
        [pathOption]: origin === 'absolute' ? assetPath : `./${assetName}`,
      }
      const config: OxfmtRuleOptions = {}
      const ruleOptions: OxfmtRuleOptions = { editorconfig: false }
      const overrides = [
        {
          files: ['src/*.js'],
          options: { sortTailwindcss: tailwindOptions },
        },
      ]

      if (isInline) {
        // A conflicting config value must not change the inline path's base.
        config.sortTailwindcss = { [pathOption]: './missing' }
        if (origin === 'inline override') {
          ruleOptions.overrides = overrides
        } else {
          ruleOptions.sortTailwindcss = tailwindOptions
          ruleOptions.useConfig = origin !== 'inline without config'
        }
      } else if (origin === 'config override') {
        config.overrides = overrides
      } else {
        config.sortTailwindcss = tailwindOptions
        if (origin === 'explicit configPath') {
          ruleOptions.configPath = 'packages/app/.oxfmtrc.json'
        }
      }

      await writeFile(
        resolvePackagePath(configDir, '.oxfmtrc.json'),
        JSON.stringify(config),
      )

      const eslint = createEslint(cwd, ruleOptions, true)
      const [result] = await eslint.lintText(
        'export const classes = cn("p-4 text-review flex")\n',
        { filePath: resolvePackagePath(configDir, 'src/example.js') },
      )

      expect(result.messages).toEqual([])
      expect(result.output).toBe(
        'export const classes = cn("flex p-4 text-review");\n',
      )
    } finally {
      await rm(cwd, { force: true, recursive: true })
    }
  },
)
