// @ts-check

import { defineESLintConfig, GLOB_ALL_SRC } from '@ntnyq/eslint-config'
import { plugin as pluginOxfmt } from 'eslint-plugin-oxfmt'

export default defineESLintConfig(
  {
    ignores: ['**/dts/rule-options.d.ts'],
    oxfmt: false,
    prettier: false,
    perfectionist: {
      all: true,
    },
    test: {
      overridesVitestRules: {
        // in favor of eslint-vitest-rule-tester
        'vitest/no-standalone-expect': 'off',
      },
    },
  },
  [
    {
      files: [...GLOB_ALL_SRC],
      plugins: {
        oxfmt: pluginOxfmt,
      },
      rules: {
        'oxfmt/oxfmt': 'error',
      },
    },
  ],
)
