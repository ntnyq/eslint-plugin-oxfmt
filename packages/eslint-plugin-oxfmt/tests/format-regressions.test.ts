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
  {
    filename: 'literal.vue',
    name: 'literal v-pre content beside a Vue interpolation',
    expected: `<template>
  <div v-pre :id="a+b">{{a+b}}</div>
  <p>{{ a + b }}</p>
</template>
`,
    source:
      '<template><div v-pre :id="a+b">{{a+b}}</div><p>{{a+b}}</p></template>',
  },
  {
    filename: 'handler.vue',
    name: 'statement separators in Vue event handlers with semi disabled',
    options: { semi: false },
    expected: `<template>
  <button
    @click="
      start();
      finish()
    "
  >
    {{ count + 1 }}
  </button>
</template>
`,
    source:
      '<template><button @click="start();finish()">{{count+1}}</button></template>',
  },
  {
    filename: 'guide.md',
    name: 'Vue interpolations and v-pre inside Markdown fences',
    expected:
      '```vue\n<template>\n  <p>{{ a + b }}</p>\n  <div v-pre>{{a+b}}</div>\n</template>\n```\n',
    source:
      '```vue\n<template>\n<p>{{a+b}}</p><div v-pre>{{a+b}}</div>\n</template>\n```',
  },
  {
    filename: 'style.css',
    name: 'combinators inside scoped CSS selectors',
    source: '.root:deep(.a>.b), .menu:slotted(.x+.y), :local(.c~.d){color:red}',
    expected: `.root:deep(.a > .b),
.menu:slotted(.x + .y),
:local(.c ~ .d) {
  color: red;
}
`,
  },
  {
    expected: '```html\n<!DOCTYPE html>\n<p>Test</p>\n```\n',
    filename: 'embedded.md',
    name: 'doctype case inside Markdown HTML fences',
    source: '```html\n<!DOCTYPE html><p>Test</p>\n```',
  },
  {
    expected: 'const styles = clsx(helper(`pt-2 flex`), `flex pt-2`);\n',
    filename: 'classes.js',
    name: 'Tailwind class order inside unlisted nested functions',
    options: { sortTailwindcss: { functions: ['clsx'] } },
    source: 'const styles = clsx(helper(`pt-2 flex`), `pt-2 flex`);',
  },
  {
    expected: 'class Page {\n  load(@inject() ...items: Item[]) {}\n}\n',
    filename: 'decorated.ts',
    name: 'decorators on rest parameters',
    source: 'class Page { load(@inject() ...items: Item[]) {} }',
  },
  {
    expected: '',
    filename: 'empty.graphql',
    name: 'empty GraphQL documents',
    source: '',
  },
  {
    expected: '',
    filename: 'blank.graphql',
    name: 'whitespace-only GraphQL documents',
    source: ' \t\r\n',
  },
  {
    expected: '',
    filename: 'blank.toml',
    name: 'whitespace-only TOML documents',
    source: ' \t\r\n',
  },
  {
    filename: 'generic.astro',
    name: 'TSX generic arrow commas in Astro frontmatter and scripts',
    options: { astro: true },
    expected: `---
const identity = <T,>(value: T) => value;
---

<script>
  const identity = <T,>(value: T) => value;
</script>
`,
    source:
      '---\nconst identity = <T,>(value: T) => value\n---\n\n<script>const identity = <T,>(value: T) => value</script>',
  },
  {
    filename: 'types.js',
    name: 'JSDoc multiline types with CR line endings',
    options: { jsdoc: {} },
    expected: `/**
 * @param {{
 *   value: string;
 * }} input
 *   The input.
 */
function f(input) {}
`,
    source:
      '/**\r * @param {{\r *   value: string,\r * }} input The input.\r */\rfunction f(input) {}',
  },
  {
    filename: 'defaults.js',
    name: 'JSDoc multiline parameter defaults and descriptions',
    options: { jsdoc: {} },
    expected: `/**
 * @param {string[]} [list=[
 *   "a",
 *   "b",
 * ]]
 *   The list.
 */
function f(list) {}
`,
    source: `/**
 * @param {string[]} [list=[
 *   "a",
 *   "b",
 * ]] The list.
 */
function f(list) {}`,
  },
  {
    expected: '/**\n * ```js\n * const a = 1;\n * ```\n */\nfunction f() {}\n',
    filename: 'doc.js',
    name: 'JSDoc embedded code fences with CR line endings',
    options: { jsdoc: {} },
    source: '/**\r * ```js\r * const a=1\r * ```\r */\rfunction f() {}',
  },
  {
    expected: 'const classes = clsx(`flex\npt-2`);\n',
    filename: 'classes.js',
    name: 'CR normalization in Tailwind templates with preserved whitespace',
    source: 'const classes = clsx(`pt-2\rflex`);',
    options: {
      sortTailwindcss: { functions: ['clsx'], preserveWhitespace: true },
    },
  },
  {
    filename: 'escapes.less',
    name: 'Less escaped strings in values, URLs, and comments',
    source: "a{value:~ 'x';url:url(~ 'x.png');comment:~ /* c */ 'x'}",
    expected: `a {
  value: ~"x";
  url: url(~"x.png");
  comment: ~/* c */ "x";
}
`,
  },
  {
    filename: 'percentage.less',
    name: 'Less percentage selectors outside keyframes',
    source: '.a, 50.0%{top:0} @keyframes k{FROM,50%{top:0}}',
    expected: `.a,
50.0% {
  top: 0;
}
@keyframes k {
  from,
  50% {
    top: 0;
  }
}
`,
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
