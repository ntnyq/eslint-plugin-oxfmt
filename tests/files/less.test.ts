import { expect } from 'vitest'
import { oxfmt as rule } from '../../src/rules/oxfmt'
import { run } from '../internal'

run({
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
    {
      filename: 'extend-and-merge.less',
      code: `.a{&:extend( .b , .c )}
.merge{box-shadow  +  :0 0 1px #000}`,
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
          ".a {
            &:extend(.b, .c);
          }
          .merge {
            box-shadow+: 0 0 1px #000;
          }"
        `)
      },
    },
  ],
})
