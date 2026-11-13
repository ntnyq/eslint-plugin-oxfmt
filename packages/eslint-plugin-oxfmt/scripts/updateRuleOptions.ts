import { writeFile } from 'node:fs/promises'
import { flatConfigsToRulesDTS } from 'eslint-typegen/core'
import pluginOxfmt from '../src'
import { createRuleOptionsDeclarations } from './rule-options'

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
  new URL('../dts/rule-options.d.ts', import.meta.url),
  createRuleOptionsDeclarations(dts),
)
