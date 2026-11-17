import { oxfmt as rule } from '../../src/rules/oxfmt'
import { run } from '../rule-tester'

run({
  rule,
  invalid: [
    {
      code: 'query Empty{ }',
      filename: 'empty-selection.graphql',
      options: [{ insertFinalNewline: false, useConfig: false }],
      output: 'query Empty {}',
    },
    {
      code: String.raw`{ field(arg: "\u{1F600}") }`,
      filename: 'braced-unicode-escape.graphql',
      options: [{ insertFinalNewline: false, useConfig: false }],
      output: '{\n  field(arg: "😀")\n}',
    },
  ],
})
