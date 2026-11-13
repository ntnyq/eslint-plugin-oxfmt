import { ESLint } from 'eslint'
import { expect } from 'vitest'
import pluginOxfmt from '../../src'
import type { OxfmtRuleOptions } from '../../src/types'

/**
 * Format one source through ESLint and require a successful fix result.
 */
export async function lintText(
  cwd: string,
  filepath: string,
  source: string,
  options: OxfmtRuleOptions = {},
) {
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
  const [result] = await eslint.lintText(source, { filePath: filepath })
  expect(result.messages).toEqual([])
  return result.output ?? source
}
