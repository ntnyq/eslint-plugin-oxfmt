import { expect } from 'vitest'
import { oxfmt as rule } from '../../src/rules/oxfmt'
import { run } from '../internal'

run({
  rule,
  invalid: [
    {
      code: '# title\n\n-   item\n- item2',
      filename: 'example.md',
      options: [
        {
          insertFinalNewline: false,
          useConfig: false,
        },
      ],
      errors(errors) {
        expect(errors).toMatchSnapshot()
      },
      output(output) {
        expect(output).toMatchInlineSnapshot(`
          "# title

          - item
          - item2"
        `)
      },
    },
    {
      code: '---\ntitle:   Home\n---\n\n\n#  Heading',
      filename: 'frontmatter.md',
      options: [{ insertFinalNewline: false, useConfig: false }],
      output: '---\ntitle: Home\n---\n\n# Heading',
    },
    {
      code: '```md\n~~~js\nconst  value = 1\n~~~\n```',
      filename: 'nested-fences.md',
      options: [{ insertFinalNewline: false, useConfig: false }],
      output: '````md\n```js\nconst value = 1;\n```\n````',
    },
    {
      code: '```ts\nimport { z } from "./z";\nimport { a } from "./a";\n```',
      filename: 'sorted-imports.md',
      output: '```ts\nimport { a } from "./a";\nimport { z } from "./z";\n```',
      options: [
        { insertFinalNewline: false, sortImports: true, useConfig: false },
      ],
    },
    {
      code: '```css\nfont-family:Arial,-apple-system;\n-webkit-mask-position-x:50px,25%,-3em;\n```',
      filename: 'css-declaration-fragment.md',
      options: [{ insertFinalNewline: false, useConfig: false }],
      output:
        '```css\nfont-family: Arial, -apple-system;\n-webkit-mask-position-x: 50px, 25%, -3em;\n```',
    },
    {
      code: '- item\n\n  ```js\n  if(true){run()}\n  ```',
      filename: 'container-tabs.md',
      options: [{ insertFinalNewline: false, useConfig: false, useTabs: true }],
      output: '- item\n\n  ```js\n  if (true) {\n  \trun();\n  }\n  ```',
    },
  ],
  valid: [
    {
      code: '中文内容\n继续阅读。\n\n日本語の文章は\nそのままです。',
      filename: 'cjk-always.md',
      options: [
        { insertFinalNewline: false, proseWrap: 'always', useConfig: false },
      ],
    },
    {
      code: '中文内容\n继续阅读。\n\n日本語の文章は\nそのままです。',
      filename: 'cjk-never.md',
      options: [
        { insertFinalNewline: false, proseWrap: 'never', useConfig: false },
      ],
    },
    {
      code: '中文内容\n继续阅读。\n\n日本語の文章は\nそのままです。',
      filename: 'cjk-preserve.md',
      options: [
        { insertFinalNewline: false, proseWrap: 'preserve', useConfig: false },
      ],
    },
    {
      code: '```js {4}\nconst values = [\n  1, 2,\n];\nconsole.log(values);\n```',
      filename: 'line-ranged-fence.md',
      options: [{ insertFinalNewline: false, useConfig: false }],
    },
    {
      code: '- item\n  - nested\n\n    > first\n    > second',
      filename: 'container-spaces.md',
      options: [{ insertFinalNewline: false, useConfig: false, useTabs: true }],
    },
    {
      code: '---\ntitle:   Home\n---\n\n# Heading',
      filename: 'frontmatter-embedded-off.md',
      options: [
        {
          embeddedLanguageFormatting: 'off',
          insertFinalNewline: false,
          useConfig: false,
        },
      ],
    },
    {
      code: 'H~2~O',
      filename: 'single-tilde.md',
      options: [{ insertFinalNewline: false, useConfig: false }],
    },
    {
      code: 'An invalid value means a\n{{jsxref("TypeError")}} is thrown.',
      filename: 'liquid-paragraph.md',
      options: [{ insertFinalNewline: false, useConfig: false }],
    },
    {
      code: '**Uses $INPUT** from `setup.sh` and `run.sh`, plus `$OUTPUT` from `end.sh`, before starting.',
      filename: 'dollar-signs.md',
      options: [{ insertFinalNewline: false, useConfig: false }],
    },
  ],
})
