import { expect } from 'vitest'
import { oxfmt as rule } from '../../src/rules/oxfmt'
import { run } from '../internal'

run({
  rule,
  invalid: [
    {
      code: `<script>let foo = 1</script>\n<Component foo={foo} />`,
      filename: 'allow-shorthand.svelte',
      options: [
        {
          insertFinalNewline: false,
          semi: false,
          singleQuote: true,
          useConfig: false,
          svelte: {
            allowShorthand: false,
          },
        },
      ],
      errors(errors) {
        expect(errors).toMatchSnapshot()
      },
      output(output) {
        expect(output).toMatchInlineSnapshot(`
          "<script>
            let foo = 1
          </script>

          <Component foo={foo} />"
        `)
      },
    },
    {
      code: `<script>let count = 0</script>\n<style>.box { color: red; }</style>\n<div class="box">{count}</div>`,
      filename: 'indent-script-style.svelte',
      options: [
        {
          insertFinalNewline: false,
          semi: false,
          singleQuote: true,
          useConfig: false,
          svelte: {
            indentScriptAndStyle: false,
          },
        },
      ],
      errors(errors) {
        expect(errors).toMatchSnapshot()
      },
      output(output) {
        expect(output).toMatchInlineSnapshot(`
          "<script>
          let count = 0
          </script>

          <div class="box">{count}</div>

          <style>
          .box {
            color: red;
          }
          </style>"
        `)
      },
    },
    {
      code: `<style>.box { color: red; }</style>\n<div class="box">Hello</div>\n<script>const name = "x"</script>`,
      filename: 'sort-order.svelte',
      options: [
        {
          insertFinalNewline: false,
          semi: false,
          singleQuote: true,
          useConfig: false,
          svelte: {
            sortOrder: 'scripts-markup-styles-options',
          },
        },
      ],
      errors(errors) {
        expect(errors).toMatchSnapshot()
      },
      output(output) {
        expect(output).toMatchInlineSnapshot(`
          "<script>
            const name = 'x'
          </script>

          <div class="box">Hello</div>

          <style>
            .box {
              color: red;
            }
          </style>"
        `)
      },
    },
  ],
})
