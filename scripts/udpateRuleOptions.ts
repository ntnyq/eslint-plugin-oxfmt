import { writeFile } from 'node:fs/promises'
import { flatConfigsToRulesDTS } from 'eslint-typegen/core'
import pluginOxfmt from '../src'

const dts = await flatConfigsToRulesDTS(
  [
    // recommended config
    pluginOxfmt.configs.recommended,
  ],
  {
    includeAugmentation: false,
  },
)

await writeFile(
  'dts/rule-options.d.ts',
  dts
    .replace('export interface RuleOptions {', 'export type RuleOptions = {')
    .replace('type OxfmtOxfmt =', 'export type OxfmtOxfmt ='),
)
