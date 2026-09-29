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
  ],
  valid: [
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
