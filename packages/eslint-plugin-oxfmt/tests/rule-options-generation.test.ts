import { expect, it } from 'vitest'
import { createRuleOptionsDeclarations } from '../scripts/rule-options'

const GENERATOR_OUTPUT = `export interface RuleOptions {
  'oxfmt/oxfmt'?: OxfmtOxfmt
}
type OxfmtOxfmt = [{ semi?: boolean }?]
`

it('retains the strict tuple and historical custom-group compatibility adapter', () => {
  const declarations = createRuleOptionsDeclarations(GENERATOR_OUTPUT)

  expect(declarations).toContain('export type RuleOptions = {')
  expect(declarations).toContain('export type OxfmtRuleOptionsTuple =')
  expect(declarations).toContain(
    'export type OxfmtOxfmt = PreserveLegacyCustomGroupInputs<OxfmtRuleOptionsTuple>',
  )
})

it.each(['export interface RuleOptions {', 'type OxfmtOxfmt ='])(
  'fails explicitly for missing or repeated generator anchor %s',
  anchor => {
    expect(() =>
      createRuleOptionsDeclarations(GENERATOR_OUTPUT.replace(anchor, '')),
    ).toThrow('found 0')
    expect(() =>
      createRuleOptionsDeclarations(`${GENERATOR_OUTPUT}\n${anchor}`),
    ).toThrow('found 2')
  },
)
