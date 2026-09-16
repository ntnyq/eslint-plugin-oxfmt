import { expect } from 'vitest'
import { oxfmt as rule } from '../../src/rules/oxfmt'
import { run } from '../internal'

run({
  rule,
  invalid: [
    {
      code: 'const el = <div className="box"></div>',
      filename: 'example.jsx',
      options: [
        {
          insertFinalNewline: false,
          jsxSingleQuote: true,
          useConfig: false,
        },
      ],
      errors(errors) {
        expect(errors).toMatchSnapshot()
      },
      output(output) {
        expect(output).toMatchInlineSnapshot(
          `"const el = <div className='box'></div>;"`,
        )
      },
    },
  ],
  valid: [
    {
      filename: 'logical-chain-comment.jsx',
      options: [{ insertFinalNewline: false, useConfig: false }],
      code: `const element = (
  <div>
    {ready && visible && (
      // Keep the conditions together
      <span />
    )}
  </div>
);`,
    },
  ],
})
