import { expect } from 'vitest'
import { oxfmt as rule } from '../../src/rules/oxfmt'
import { run } from '../internal'

run({
  rule,
  invalid: [
    {
      code: '{"name":"foo","list":[1,2,3]}',
      filename: 'example.json',
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
        expect(output).toMatchInlineSnapshot(
          `"{ "name": "foo", "list": [1, 2, 3] }"`,
        )
      },
    },
    {
      code: '{"value": true + false}',
      filename: 'invalid.json',
      options: [{ useConfig: false }],
      output: null,
      errors: [
        {
          message: 'Failed to format code: This syntax is not allowed in JSON',
        },
      ],
    },
    {
      code: '{"value": !1}',
      filename: 'invalid.json',
      options: [{ useConfig: false }],
      output: null,
      errors: [
        {
          message: 'Failed to format code: This syntax is not allowed in JSON',
        },
      ],
    },
  ],
})
