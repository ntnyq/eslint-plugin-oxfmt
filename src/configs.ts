import { parserPlain } from './parser'
import plugin from '.'
import type { Linter } from 'eslint'
import type { PluginOxfmt } from './types'

export const recommendedWithoutParser: Linter.Config<Linter.RulesRecord> = {
  name: 'oxfmt/recommended-without-parser',
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

export const recommended: Linter.Config<Linter.RulesRecord> = {
  ...recommendedWithoutParser,
  name: 'oxfmt/recommended',
  languageOptions: {
    parser: parserPlain,
  },
}

export const configs: PluginOxfmt['configs'] = {
  recommended,
  recommendedWithoutParser,
}
