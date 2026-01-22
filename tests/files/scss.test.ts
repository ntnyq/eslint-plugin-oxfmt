import { expect } from 'vitest'
import { oxfmt as rule } from '../../src/rules/oxfmt'
import { run } from '../internal'

run({
  name: 'file: scss',
  rule,
  invalid: [
    {
      code: '.parent{.child{color:red}}',
      filename: 'example.scss',
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
          ".parent {
            .child {
              color: red;
            }
          }"
        `)
      },
    },
  ],
})
