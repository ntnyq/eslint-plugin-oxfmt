import { oxfmt as rule } from '../../src/rules/oxfmt'
import { run } from '../internal'

run({
  rule,
  invalid: [
    {
      code: 'values = {\n one=1,\n two=2,\n}\n',
      filename: 'toml-1.1.toml',
      options: [{ useConfig: false }],
      output: 'values = { one = 1, two = 2 }\n',
    },
    {
      code: '+++\ntitle="Home"\n+++\n\n```toml\na=1\n```\n',
      filename: 'embedded-toml.md',
      options: [{ useConfig: false }],
      output: '+++\ntitle = "Home"\n+++\n\n```toml\na = 1\n```\n',
    },
  ],
  valid: [
    {
      code: '+++\ntitle="Home"\n+++\n\n```toml\na=1\n```\n',
      filename: 'embedded-toml-off.md',
      options: [{ embeddedLanguageFormatting: 'off', useConfig: false }],
    },
  ],
})
