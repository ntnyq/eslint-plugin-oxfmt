import * as published from 'eslint-plugin-oxfmt'
import { expect, expectTypeOf, it } from 'vitest'
import * as source from '../src'
import { oxfmtConfigSchema, pluginOptionsSchema } from '../src/schema'
import type { LoadOxfmtConfigOptions } from 'load-oxfmt-config'
import type {
  OxfmtOxfmt,
  OxfmtRuleOptionsTuple,
  RuleOptions,
} from '../dts/rule-options'
import type {
  OxfmtRuleOptions,
  OxfmtWorkerOptions,
  RuleOxfmtOptions,
} from '../src'

it('preserves the published runtime exports and presets', () => {
  const names = [
    'cliParity',
    'configs',
    'default',
    'meta',
    'parserPlain',
    'plugin',
    'recommended',
    'recommendedWithoutParser',
    'rules',
  ]
  expect(Object.keys(source).sort()).toEqual(names.sort())
  expect(Object.keys(published).sort()).toEqual(names.sort())
  expect(published.default).toBe(published.plugin)
  expect(published.configs.recommended).toBe(published.recommended)
  expect(oxfmtConfigSchema).toBe(pluginOptionsSchema)
})

it('keeps user option keys aligned with generated schema types', () => {
  expectTypeOf<keyof OxfmtRuleOptions>().toEqualTypeOf<
    keyof NonNullable<OxfmtRuleOptionsTuple[0]>
  >()
  expectTypeOf<OxfmtWorkerOptions>().toEqualTypeOf<
    OxfmtRuleOptions & Pick<LoadOxfmtConfigOptions, 'cwd'>
  >()
  expectTypeOf<Pick<RuleOxfmtOptions, 'cwd' | 'filepath'>>().toEqualTypeOf<
    Pick<LoadOxfmtConfigOptions, 'cwd' | 'filepath'>
  >()
  expectTypeOf<published.OxfmtRuleOptions>().toEqualTypeOf<OxfmtRuleOptions>()
  expectTypeOf<published.RuleOxfmtOptions>().toEqualTypeOf<RuleOxfmtOptions>()
})

it('preserves string-based custom group inputs in the historical type subpath', () => {
  function createOptions(selector: string, modifiers: string[]): OxfmtOxfmt {
    const customGroups = [{ groupName: 'custom', modifiers, selector }]
    return [
      {
        sortImports: { customGroups },
        overrides: [
          { files: ['**/*.ts'], options: { sortImports: { customGroups } } },
        ],
      },
    ]
  }
  const options = createOptions('type', ['type'])
  const config: RuleOptions = { 'oxfmt/oxfmt': ['error', ...options] }
  expect(config['oxfmt/oxfmt']).toEqual(['error', ...options])
  expect(options[0]?.sortImports).toEqual({
    customGroups: [
      { groupName: 'custom', modifiers: ['type'], selector: 'type' },
    ],
  })
  type StrictGroup = NonNullable<
    Extract<
      NonNullable<OxfmtRuleOptions['sortImports']>,
      object
    >['customGroups']
  >[number]
  expectTypeOf<string>().not.toExtend<StrictGroup['selector']>()
  expectTypeOf<string[]>().not.toExtend<StrictGroup['modifiers']>()
})
