import { oxfmt as rule } from '../../src/rules/oxfmt'
import { run } from '../internal'

run({
  rule,
  invalid: [
    {
      code: '---\nconst value={a:1}\n---\n<div   id="app">{value.a}</div>',
      filename: 'example.astro',
      options: [{ astro: true, useConfig: false }],
      output:
        '---\nconst value = { a: 1 };\n---\n\n<div id="app">{value.a}</div>\n',
    },
    {
      code: '---\nconst value={a:1}\n---\n<div   id="app">{value.a}</div>',
      filename: 'skip-frontmatter.astro',
      options: [{ astro: { skipFrontmatter: true }, useConfig: false }],
      output: '---\nconst value={a:1}\n---\n\n<div id="app">{value.a}</div>\n',
    },
  ],
})
