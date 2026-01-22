import { expect } from 'vitest'
import { oxfmt as rule } from '../../src/rules/oxfmt'
import { run } from '../internal'

run({
  name: 'file: less',
  rule,
  invalid: [
    {
      code: '@primary:#fff;.btn{color:@primary}',
      filename: 'example.less',
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
          "@primary: #fff;
          .btn {
            color: @primary;
          }"
        `)
      },
    },
  ],
})
