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
  ],
})
