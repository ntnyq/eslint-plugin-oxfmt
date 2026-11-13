import { ESLint } from 'eslint'
import { expect, it } from 'vitest'
import pluginOxfmt from '../src'
import { FIXTURE_BASE_CWD } from './helpers/fixtures'
import { resolvePackagePath } from './helpers/paths'
import type { OxfmtRuleOptions } from '../src/types'

it('should reject ignorePatterns inside rule-level override options', async () => {
  const eslint = new ESLint({
    cwd: FIXTURE_BASE_CWD,
    ignore: false,
    overrideConfigFile: true,
    overrideConfig: [
      {
        ...pluginOxfmt.configs.recommended,
        files: ['**/*.js'],
        rules: {
          'oxfmt/oxfmt': [
            'error',
            {
              useConfig: false,
              overrides: [
                {
                  files: ['**/*.js'],
                  options: {
                    ignorePatterns: ['**/ignored/**'],
                  },
                },
              ],
            } as unknown as OxfmtRuleOptions,
          ],
        },
      },
    ],
  })

  await expect(
    eslint.lintText('const value=1\n', {
      filePath: resolvePackagePath(FIXTURE_BASE_CWD, 'example.js'),
    }),
  ).rejects.toThrow('ignorePatterns')
})
