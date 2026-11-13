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

const strictDeclarations = dts
  .replace('export interface RuleOptions {', 'export type RuleOptions = {')
  .replace('type OxfmtOxfmt =', 'export type OxfmtRuleOptionsTuple =')

// The historical subpath accepted strings for custom group selectors/modifiers.
// Preserve those input types while exposing the schema-derived strict tuple.
const compatibilityDeclarations = `
/**
 * Historical rule options with string-based custom group inputs preserved.
 */
export type OxfmtOxfmt = PreserveLegacyCustomGroupInputs<OxfmtRuleOptionsTuple>

type PreserveLegacyCustomGroupInputs<Options> = Options extends object
  ? {
      [Key in keyof Options]: Key extends 'selector'
        ? string
        : Key extends 'modifiers'
          ? string[]
          : PreserveLegacyCustomGroupInputs<Options[Key]>
    }
  : Options
`

await writeFile(
  'dts/rule-options.d.ts',
  `${strictDeclarations}\n${compatibilityDeclarations}`.replaceAll(
    /[\t ]+$/gmu,
    '',
  ),
)
