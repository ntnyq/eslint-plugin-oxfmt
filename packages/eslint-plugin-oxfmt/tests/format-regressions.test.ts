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
  {
    expected: '<title>Docs</title>\n</head>\n<p>Hello</p>\n</body>\n</html>\n',
    filename: 'page.html',
    name: 'HTML end tags with omitted opening tags',
    source: '<title>Docs</title></head><p>Hello</p></body></html>',
  },
  {
    expected: '<!DOCTYPE html>\n<script src="app.js" />\n<p>Text</p>\n',
    filename: 'page.xhtml',
    name: 'XHTML doctype case and self-closing script elements',
    source: '<!DOCTYPE html><script src="app.js"/><p>Text</p>',
  },
  {
    filename: 'icon.html',
    name: 'preserved SVG text whitespace',
    expected:
      '<svg><text xml:space="preserve">  a <tspan>b</tspan>  c</text></svg>\n',
    source:
      '<svg><text xml:space="preserve">  a <tspan>b</tspan>  c</text></svg>',
  },
  {
    filename: 'template.js',
    name: 'dynamic closing tags in HTML templates',
    source: `html\`<\${tag}> <p>one</p> <p>two</p> </\${tag}>\`;`,
    expected: `html\`<\${tag}>
  <p>one</p>
  <p>two</p>
</\${tag}>\`;
`,
  },
  {
    filename: 'fence.md',
    name: 'whitespace-only pre and textarea content in Markdown HTML fences',
    source: '```html\n<div><pre>  </pre><textarea>  </textarea></div>\n```',
    expected:
      '```html\n<div>\n  <pre>  </pre>\n  <textarea>  </textarea>\n</div>\n```\n',
  },
  {
    filename: 'private.js',
    name: 'optional private field access after nullish coalescing',
    source: 'class Item { #id; read(a, b) { return (a ?? b)?.#id; } }',
    expected: `class Item {
  #id;
  read(a, b) {
    return (a ?? b)?.#id;
  }
}
`,
  },
  {
    expected: 'const fn = <(<T>(x: T) => T)>impl;\n',
    filename: 'generic.ts',
    name: 'generic function types inside angle-bracket assertions',
    source: 'const fn = < <T>(x: T) => T>impl;',
  },
  {
    expected: 'const f = () => (function () {}.ready ? on : off);\n',
    filename: 'conditional.js',
    name: 'conditional arrow bodies starting with a function expression',
    source: 'const f = () => (function () {}).ready ? on : off;',
  },
  {
    expected: '(\n  firstLongOperand +\n  secondLongOperand\n)[key];\n',
    filename: 'computed.js',
    name: 'wrapping a binary expression before computed member access',
    options: { printWidth: 30 },
    source: '(firstLongOperand + secondLongOperand)[key];',
  },
]

it.each(FORMAT_CASES)(
  'should preserve oxfmt formatting for $name',
  async ({ expected, filename, options, source }) => {
    const cwd = resolve('tests/fixtures/base')
    const eslint = new ESLint({
      cwd,
      fix: true,
      overrideConfigFile: true,
      overrideConfig: [
        {
          ...pluginOxfmt.configs.recommended,
          files: [filename],
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
