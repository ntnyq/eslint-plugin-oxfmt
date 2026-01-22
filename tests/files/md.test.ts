import { expect } from 'vitest'
import { oxfmt as rule } from '../../src/rules/oxfmt'
import { run } from '../internal'

run({
  name: 'file: md',
  rule,
  invalid: [
    {
      code: '# title\n\n-   item\n- item2',
      filename: 'example.md',
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
          "# title

          - item
          - item2"
        `)
      },
    },
  ],
})
