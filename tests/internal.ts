import { run as _run } from 'eslint-vitest-rule-tester'
import { parserPlain } from '../src'
import type {
  RuleTesterInitOptions,
  TestCasesOptions,
} from 'eslint-vitest-rule-tester'
import type { OxfmtOxfmt as RuleOxfmtOptions } from '../dts/rule-options'

export function run(
  options: RuleTesterInitOptions & TestCasesOptions<RuleOxfmtOptions>,
) {
  return _run({
    languageOptions: {
      parser: parserPlain,
    },
    ...options,
  })
}

export { unindent as $, unindent } from 'eslint-vitest-rule-tester'
