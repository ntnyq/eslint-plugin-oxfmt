import { expect } from 'vitest'
import { oxfmt as rule } from '../../src/rules/oxfmt'
import { run } from '../rule-tester'

run({
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
    {
      code: '<p>中文</p>\r\n<script>',
      filename: 'invalid.html',
      options: [{ useConfig: false }],
      output: null,
      errors(errors) {
        expect(errors).toMatchObject([
          {
            column: 1,
            endColumn: 9,
            endLine: 2,
            line: 2,
            message: expect.stringContaining('missing end tag'),
          },
        ])
      },
    },
  ],
})
