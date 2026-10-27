import { ESLint } from 'eslint'
import { expect, it } from 'vitest'
import { resolve } from '../scripts/utils'
import pluginOxfmt from '../src'
import type { RuleOxfmtOptions } from '../src/types'

const FORMAT_CASES: {
  expected: string
  filename: string
  name: string
  source: string
  options?: RuleOxfmtOptions
}[] = [
  {
    filename: 'keywords.js',
    name: 'semicolons before quoted class keyword members',
    options: { semi: false },
    source: 'class Example { value = 1; "in"; other = 2; "instanceof"() {} }',
    expected: `class Example {
  value = 1;
  in
  other = 2;
  instanceof() {}
}
`,
  },
  {
    filename: 'keywords.ts',
    name: 'semicolons before quoted TypeScript class fields',
    options: { semi: false },
    source: 'class Example { value = 1; "in": number; }',
    expected: `class Example {
  value = 1;
  "in": number
}
`,
  },
  {
    filename: 'private.js',
    name: 'parentheses around private in expressions',
    expected: `class Example {
  #value;
  check(target) {
    return (#value in target).value;
  }
}
`,
    source:
      'class Example { #value; check(target) { return (#value in target).value; } }',
  },
  {
    filename: 'instantiation.ts',
    name: 'parentheses around instantiation operands',
    expected: `result = (condition ? first : second)<T>;
result = (value as Factory)<T>;
`,
    source:
      'result = (condition ? first : second)<T>; result = (value as Factory)<T>;',
  },
  {
    expected: 'result = <Factory>(make<T>) + other;\n',
    filename: 'assertion.ts',
    name: 'parentheses around instantiations inside type assertions',
    source: 'result = (<Factory>(make<T>)) + other;',
  },
  {
    filename: 'spread.jsx',
    name: 'comments inside JSX spread children',
    source: '<div>{...items\n// keep comment\n}</div>;',
    expected: `<div>
  {
    ...items
    // keep comment
  }
</div>;
`,
  },
  {
    expected: 'const\n  --> keep comment\n  value = 2;\n',
    filename: 'comment.cjs',
    name: 'line-start HTML closing comments in scripts',
    source: 'const\n--> keep comment\nvalue = 2;',
  },
  {
    filename: 'array.js',
    name: 'concise arrays with a comment after the opening bracket',
    options: { printWidth: 40 },
    source: 'values = [ // keep comment\n1, 2, 3, 4, 5, 6, 7, 8, 9, 10];',
    expected: `values = [
  // keep comment
  1, 2, 3, 4, 5, 6, 7, 8, 9, 10,
];
`,
  },
  {
    filename: 'unicode.js',
    name: 'display width of object keys',
    options: { printWidth: 60 },
    expected: `value = {
  古体诗:
    "https://example.com/some/long/path/that/exceeds/the/print/width",
};
`,
    source:
      'value = {\n古体诗: "https://example.com/some/long/path/that/exceeds/the/print/width",\n};',
  },
  {
    filename: 'arrow.js',
    name: 'arrow signatures exactly filling the print width',
    options: { printWidth: 80 },
    expected: `const exactlyFillsThePrintWidthEightySignatureLinePaddedToLengthOkOkOkO = (x) =>
  cond ? longlonglong : shortshort;
`,
    source:
      'const exactlyFillsThePrintWidthEightySignatureLinePaddedToLengthOkOkOkO = (x) => cond ? longlonglong : shortshort;',
  },
  {
    filename: 'directive.md',
    name: 'Markdown range ignores inside directives',
    expected: `::: details Example

<!-- prettier-ignore-start -->
| a | b |
| - | - |
*   kept
<!-- prettier-ignore-end -->

:::
`,
    source: `::: details Example

<!-- prettier-ignore-start -->
| a | b |
| - | - |
*   kept
<!-- prettier-ignore-end -->

:::
`,
  },
]

it.each(FORMAT_CASES)(
  'should preserve oxfmt 0.75.0 formatting for $name',
  async ({ expected, filename, options, source }) => {
    const cwd = resolve('tests/fixtures/base')
    const eslint = new ESLint({
      cwd,
      fix: true,
      overrideConfigFile: true,
      overrideConfig: [
        {
          ...pluginOxfmt.configs.recommended,
          files: ['**/*.{js,cjs,ts,jsx,md}'],
          rules: {
            'oxfmt/oxfmt': ['error', { ...options, useConfig: false }],
          },
        },
      ],
    })
    const filePath = resolve(cwd, filename)
    const [result] = await eslint.lintText(source, { filePath })

    expect(result.messages).toEqual([])
    expect(result.output ?? source).toBe(expected)

    const [secondResult] = await eslint.lintText(expected, { filePath })
    expect(secondResult.messages).toEqual([])
    expect(secondResult.output).toBeUndefined()
  },
)
