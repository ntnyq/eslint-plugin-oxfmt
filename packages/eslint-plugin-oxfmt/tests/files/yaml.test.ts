import { expect } from 'vitest'
import { oxfmt as rule } from '../../src/rules/oxfmt'
import { $, run } from '../internal'

run({
  rule,
  invalid: [
    {
      filename: 'example.yaml',
      code: $`
        name:   foo
      `,
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
        expect(output).toMatchInlineSnapshot(`"name: foo"`)
      },
    },
    {
      code: 'map:\n  key: value\n  seq:\n    - a\n    - b',
      filename: 'zero-tab-width.yaml',
      options: [{ insertFinalNewline: false, tabWidth: 0, useConfig: false }],
      output: 'map:\n key: value\n seq:\n  - a\n  - b',
    },
    {
      code: '--- |1-',
      filename: 'root-indent-indicator.yaml',
      options: [{ insertFinalNewline: false, useConfig: false }],
      output: '---\n|1-',
    },
  ],
  valid: [
    {
      code: '...\n...\n---\n...',
      filename: 'empty-document-end-markers.yaml',
      options: [{ insertFinalNewline: false, useConfig: false }],
    },
  ],
})
