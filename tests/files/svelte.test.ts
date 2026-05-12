import { expect } from 'vitest'
import { oxfmt as rule } from '../../src/rules/oxfmt'
import { run } from '../internal'

run({
  rule,
  invalid: [
    {
      code: `<script lang="ts">const name = "foo"</script>\n<h1 class="title">{name}</h1>`,
      filename: 'example.svelte',
      options: [
        {
          insertFinalNewline: false,
          semi: false,
          singleQuote: true,
          svelte: true,
          useConfig: false,
        },
      ],
      errors(errors) {
        expect(errors).toMatchSnapshot()
      },
      output(output) {
        expect(output).toMatchInlineSnapshot(`
          "<script lang="ts">
            const name = 'foo'
          </script>

          <h1 class="title">{name}</h1>"
        `)
      },
    },
  ],
})
