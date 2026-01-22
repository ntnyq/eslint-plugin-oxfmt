import { expect } from 'vitest'
import { oxfmt as rule } from '../../src/rules/oxfmt'
import { $, run } from '../internal'

run({
  name: 'file: yaml',
  rule,
  invalid: [
    {
      filename: 'example.yaml',
      code: $`
        name:   foo
      `,
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
        expect(output).toMatchInlineSnapshot(`"name: foo"`)
      },
    },
  ],
})
