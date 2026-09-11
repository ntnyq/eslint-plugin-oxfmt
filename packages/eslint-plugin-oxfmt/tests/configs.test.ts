import { expect, it } from 'vitest'
import { configs, parserPlain } from '../src'

it('should keep recommended with plain parser', () => {
  expect(configs.recommended.name).toBe('oxfmt/recommended')
  expect(configs.recommended.languageOptions?.parser).toBe(parserPlain)
})

it('should expose a parser-agnostic preset', () => {
  expect(configs.recommendedWithoutParser.name).toBe(
    'oxfmt/recommended-without-parser',
  )
  expect(
    configs.recommendedWithoutParser.languageOptions?.parser,
  ).toBeUndefined()
})

it('should expose a cli parity preset', () => {
  expect(configs.cliParity.name).toBe('oxfmt/cli-parity')
  expect(configs.cliParity.languageOptions?.parser).toBeUndefined()
  expect(configs.cliParity.rules?.['oxfmt/oxfmt']).toEqual([
    'error',
    {
      disableNestedConfig: false,
      respectOxfmtDefaultIgnores: true,
      useConfig: true,
      withNodeModules: false,
    },
  ])
})
