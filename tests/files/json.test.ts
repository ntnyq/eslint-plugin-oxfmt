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
  ],
})
