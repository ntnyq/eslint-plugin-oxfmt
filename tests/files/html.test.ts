import { expect } from 'vitest'
import { oxfmt as rule } from '../../src/rules/oxfmt'
import { run } from '../internal'

run({
  name: 'file: html',
  rule,
  invalid: [
    {
      code: '<div>\n<p>Hi</p>\n</div>',
      filename: 'example.html',
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
          "<div>
            <p>Hi</p>
          </div>"
        `)
      },
    },
  ],
})
