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
