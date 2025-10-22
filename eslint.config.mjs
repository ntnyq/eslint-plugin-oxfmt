// @ts-check

import { defineESLintConfig } from '@ntnyq/eslint-config'

export default defineESLintConfig({
  ignores: ['**/dts/rule-options.d.ts'],
  perfectionist: {
    all: true,
  },
  test: {
    overridesVitestRules: {
      // in favor of eslint-vitest-rule-tester
      'vitest/no-standalone-expect': 'off',
    },
  },
})
