import { expect } from 'vitest'
import { oxfmt as rule } from '../../src/rules/oxfmt'
import { run } from '../internal'

run({
  rule,
  invalid: [
    {
      code: 'const numbers: number[] = [1,2,3]',
      filename: 'example.ts',
      options: [
        {
          insertFinalNewline: false,
          semi: false,
          singleQuote: true,
          useConfig: false,
        },
      ],
      errors(errors) {
        expect(errors).toMatchSnapshot()
      },
      output(output) {
        expect(output).toMatchInlineSnapshot(
          `"const numbers: number[] = [1, 2, 3]"`,
        )
      },
    },
    {
      filename: 'quote-props.ts',
      code: `enum Example { "valid" = 1, "not-valid" = 2 }
interface Methods { "valid"(): void; "not-valid"(): void }`,
      options: [
        {
          insertFinalNewline: false,
          quoteProps: 'as-needed',
          useConfig: false,
        },
      ],
      errors(errors) {
        expect(errors).toMatchSnapshot()
      },
      output(output) {
        expect(output).toMatchInlineSnapshot(`
          "enum Example {
            valid = 1,
            \"not-valid\" = 2,
          }
          interface Methods {
            valid(): void;
            \"not-valid\"(): void;
          }"
        `)
      },
    },
  ],
})
