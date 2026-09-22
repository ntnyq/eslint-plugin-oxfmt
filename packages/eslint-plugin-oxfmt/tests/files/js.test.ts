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
    {
      code: 'const value = /* first */ // second\n  call( a,b )',
      filename: 'after-operator-comments.js',
      options: [{ insertFinalNewline: false, useConfig: false }],
      output: 'const value = /* first */ // second\n  call(a, b);',
    },
    {
      code: 'const value = /* multi\n * line */ source;',
      filename: 'assignment-block-comment.js',
      options: [{ insertFinalNewline: false, useConfig: false }],
      output: 'const value =\n  /* multi\n   * line */ source;',
    },
    {
      code: 'const [api] = useState(() => /** @type {Api} */ ({ setBlocker(id) { record(id); }, }));',
      filename: 'typecast-arrow-body.js',
      options: [{ insertFinalNewline: false, useConfig: false }],
      output: `const [api] = useState(
  () =>
    /** @type {Api} */ ({
      setBlocker(id) {
        record(id);
      },
    }),
);`,
    },
  ],
  valid: [
    {
      code: 'const value = // prettier-ignore\n  call( a,b );',
      filename: 'after-operator-suppression.js',
      options: [{ insertFinalNewline: false, useConfig: false }],
    },
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
