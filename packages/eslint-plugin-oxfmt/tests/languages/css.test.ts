import { expect } from 'vitest'
import { oxfmt as rule } from '../../src/rules/oxfmt'
import { run } from '../rule-tester'

run({
  rule,
  invalid: [
    {
      code: '.btn{color:red}',
      filename: 'example.css',
      options: [
        {
          insertFinalNewline: false,
          useConfig: false,
        },
      ],
      errors(errors) {
        expect(errors).toMatchSnapshot()
      },
      output(output) {
        expect(output).toMatchInlineSnapshot(`
          ".btn {
            color: red;
          }"
        `)
      },
    },
    {
      code: '@supports selector(.a,.b) {}',
      filename: 'supports-selector.css',
      options: [{ insertFinalNewline: false, useConfig: false }],
      output: '@supports selector(\n  .a,\n  .b\n) {\n}',
    },
  ],
})
