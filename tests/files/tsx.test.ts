import { expect } from 'vitest'
import { oxfmt as rule } from '../../src/rules/oxfmt'
import { run } from '../internal'

run({
  name: 'file: tsx',
  rule,
  invalid: [
    {
      code: 'const el: JSX.Element = <button type="button" aria-label="submit">Send</button>',
      filename: 'example.tsx',
      options: [
        {
          insertFinalNewline: false,
          printWidth: 20,
          singleAttributePerLine: true,
          useConfig: false,
        },
      ],
      errors(errors) {
        expect(errors).toMatchSnapshot()
      },
      output(output) {
        expect(output).toMatchInlineSnapshot(`
          "const el: JSX.Element =
            (
              <button
                type="button"
                aria-label="submit"
              >
                Send
              </button>
            );"
        `)
      },
    },
  ],
})
