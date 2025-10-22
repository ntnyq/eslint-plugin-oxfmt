import { parserPlain } from './parser'
import plugin from '.'
import type { Linter } from 'eslint'
import type { PluginOxfmt } from './types'

export const recommended: Linter.Config<Linter.RulesRecord> = {
  name: 'oxfmt/recommended',
  languageOptions: {
    parser: parserPlain,
  },
  plugins: {
    /* v8 ignore start */
    get oxfmt() {
      return plugin
    },
    /* v8 ignore stop */
  },
  rules: {
    'oxfmt/oxfmt': 'error',
  },
}

export const configs: PluginOxfmt['configs'] = {
  recommended,
}
