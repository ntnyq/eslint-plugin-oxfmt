import type { Linter, Rule } from 'eslint'

export interface PluginOxfmt {
  configs: {
    recommended: Linter.Config<Linter.RulesRecord>
  }
  meta: {
    name: string
    version: string
  }
  rules: {
    oxfmt: Rule.RuleModule
  }
}
