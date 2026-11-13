import { ESLint } from 'eslint'
import * as jsoncParser from 'jsonc-eslint-parser'
import { expect, it } from 'vitest'
import pluginOxfmt from '../src'
import { FIXTURE_BASE_CWD, normalizeLineEndings } from './helpers/fixtures'
import { resolvePackagePath } from './helpers/paths'
import type { Linter } from 'eslint'

it('should work with jsonc-eslint-parser when using recommendedWithoutParser', async () => {
  const jsoncSourceText = normalizeLineEndings(`{
  // a comment only supported by json/jsonc parsers
  "name":"foo",
  "list":[1,2,3,],
}
`)
  const jsoncFilePath = resolvePackagePath(FIXTURE_BASE_CWD, 'example.jsonc')
  const jsSourceText = normalizeLineEndings(`console.log("hello")\n`)
  const jsFilePath = resolvePackagePath(FIXTURE_BASE_CWD, 'example.js')

  const baseConfig = [
    {
      ...pluginOxfmt.configs.recommendedWithoutParser,
      files: ['**/*.{js,ts,json,jsonc}'],
      rules: {
        'oxfmt/oxfmt': ['error', { useConfig: false }],
      },
    },
    {
      files: ['**/*.{json,jsonc}'],
      languageOptions: {
        parser: jsoncParser as unknown as Linter.Parser,
      },
    },
  ] satisfies Linter.Config[]

  const lintEslint = new ESLint({
    cwd: FIXTURE_BASE_CWD,
    fix: false,
    ignore: false,
    overrideConfig: baseConfig,
    overrideConfigFile: true,
  })

  const fixedEslint = new ESLint({
    cwd: FIXTURE_BASE_CWD,
    fix: true,
    ignore: false,
    overrideConfig: baseConfig,
    overrideConfigFile: true,
  })

  const [jsoncLintResult] = await lintEslint.lintText(jsoncSourceText, {
    filePath: jsoncFilePath,
  })
  expect(
    jsoncLintResult.messages.some(message => message.ruleId === null),
  ).toBe(false)
  expect(jsoncLintResult.messages.some(message => message.fatal)).toBe(false)

  const [jsLintResult] = await lintEslint.lintText(jsSourceText, {
    filePath: jsFilePath,
  })
  expect(jsLintResult.messages.some(message => message.ruleId === null)).toBe(
    false,
  )
  expect(
    jsLintResult.messages.some(message => message.ruleId === 'oxfmt/oxfmt'),
  ).toBe(true)

  const [fixedJsResult] = await fixedEslint.lintText(jsSourceText, {
    filePath: jsFilePath,
  })
  expect(typeof fixedJsResult.output).toBe('string')
  expect(normalizeLineEndings(fixedJsResult.output ?? '')).not.toBe(
    jsSourceText,
  )
})
