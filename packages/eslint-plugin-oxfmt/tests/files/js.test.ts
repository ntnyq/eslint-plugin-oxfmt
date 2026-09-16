import { expect } from 'vitest'
import { oxfmt as rule } from '../../src/rules/oxfmt'
import { run } from '../internal'

run({
  rule,
  invalid: [
    {
      code: 'const name = "foo";',
      filename: 'example.js',
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
        expect(output).toMatchInlineSnapshot(`"const name = 'foo'"`)
      },
    },
    {
      code: '// prettier-ignore\nexport const value   =   1\nnext()',
      filename: 'suppressed-export.js',
      options: [{ insertFinalNewline: false, useConfig: false }],
      output: '// prettier-ignore\nexport const value   =   1;\nnext();',
    },
    {
      code: 'call(   ) // prettier-ignore\n;[].sort()',
      filename: 'trailing-suppression.js',
      options: [{ insertFinalNewline: false, useConfig: false }],
      output: 'call(   ); // prettier-ignore\n[].sort();',
    },
  ],
  valid: [
    {
      filename: 'commented-parameter.js',
      options: [{ insertFinalNewline: false, useConfig: false }],
      code: `const getValue = (
  // Keep the parameter comment
  { value },
) => value;`,
    },
    {
      code: 'call(   ) // prettier-ignore\n;[].sort()',
      filename: 'trailing-suppression-without-semi.js',
      options: [{ insertFinalNewline: false, semi: false, useConfig: false }],
    },
  ],
})
