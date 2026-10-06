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
    {
      filename: 'test-call-comment-order.js',
      options: [{ insertFinalNewline: false, useConfig: false }],
      code: `test("x", () => {
  run();
}, // first
// second
60000);`,
      output: `test(
  "x",
  () => {
    run();
  }, // first
  // second
  60000,
);`,
    },
    {
      code: 'const value /* before */\n= // after\n  1;',
      filename: 'before-operator-comment.js',
      options: [{ insertFinalNewline: false, useConfig: false }],
      output: 'const value /* before */ = // after\n  1;',
    },
    {
      code: '/***\n * First line.  \n * Second line.\n */\nconst value = 1;',
      filename: 'jsdoc-hard-break.js',
      options: [{ insertFinalNewline: false, jsdoc: true, useConfig: false }],
      output: '/**\n * First line.\\\n * Second line.\n */\nconst value = 1;',
    },
    {
      code: 'const { text, class: className, "data-id": id } = props;\nconst value = { "color": 1, ["meta.nonce"]: 2 };',
      filename: 'consistent-pattern-and-computed-keys.js',
      options: [
        {
          insertFinalNewline: false,
          quoteProps: 'consistent',
          useConfig: false,
        },
      ],
      output:
        'const { text, "class": className, "data-id": id } = props;\nconst value = { color: 1, ["meta.nonce"]: 2 };',
    },
    {
      code: '({ value:\n  // keep\n  target } = source);',
      filename: 'assignment-target-comment.js',
      options: [{ insertFinalNewline: false, useConfig: false }],
      output: '({\n  value:\n    // keep\n    target,\n} = source);',
    },
    {
      code: 'run /* keep block */ (value);\nrun // keep line\n(value);',
      filename: 'callee-opener-comments.js',
      options: [{ insertFinalNewline: false, useConfig: false }],
      output: 'run /* keep block */(value);\nrun // keep line\n(value);',
    },
    {
      code: 'const style = css`font-family:Arial,-apple-system;`;',
      filename: 'embedded-css-signed-value.js',
      options: [{ insertFinalNewline: false, useConfig: false }],
      output: 'const style = css`\n  font-family: Arial, -apple-system;\n`;',
    },
  ],
  valid: [
    {
      code: 'const value = // keep\n  { key: 1 };',
      filename: 'object-after-operator-comment.js',
      options: [{ insertFinalNewline: false, useConfig: false }],
    },
    {
      code: '/***\n * First line.  \n * Second line.\n */\nconst value = 1;',
      filename: 'jsdoc-preserved-hard-break.js',
      options: [{ insertFinalNewline: false, useConfig: false }],
    },
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
