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
    {
      filename: 'enum-trailing-suppression.ts',
      options: [{ insertFinalNewline: false, useConfig: false }],
      code: `enum Example {
  A   = 1, // prettier-ignore
  B   = 2 // prettier-ignore
}`,
      output: `enum Example {
  A   = 1, // prettier-ignore
  B   = 2, // prettier-ignore
}`,
    },
    {
      code: 'const value = 1 as // keep\nA | B;',
      filename: 'union-after-as-comment.ts',
      options: [{ insertFinalNewline: false, useConfig: false }],
      output: 'const value = 1 as // keep\n  A | B;',
    },
    {
      code: 'const value = source satisfies // keep\nA | B;',
      filename: 'union-after-satisfies-comment.ts',
      options: [{ insertFinalNewline: false, useConfig: false }],
      output: 'const value = source satisfies // keep\n  A | B;',
    },
    {
      code: '// oxfmt-ignore\ntype Example = (((string)))',
      filename: 'suppressed-type-alias-parentheses.ts',
      options: [{ insertFinalNewline: false, useConfig: false }],
      output: '// oxfmt-ignore\ntype Example = (((string)));',
    },
  ],
  valid: [
    {
      filename: 'decorated-class.ts',
      code: `// prettier-ignore
@Decorator({ values: [1,   2] })
export   class Example {}`,
      options: [
        {
          insertFinalNewline: false,
          useConfig: false,
        },
      ],
    },
  ],
})
