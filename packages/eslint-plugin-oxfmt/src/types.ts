import type { Linter, Rule } from 'eslint'
import type {
  IsOxfmtIgnoredResult,
  LoadOxfmtConfigOptions,
  OxfmtOptions,
} from 'load-oxfmt-config'
import type { format } from 'oxfmt'
import type { OxfmtRuleOptionsTuple } from '../dts/rule-options'

/**
 * Plugin controls accepted by the rule schema.
 */
export type OxfmtPluginOptions = Pick<
  LoadOxfmtConfigOptions,
  'configPath' | 'disableNestedConfig' | 'editorconfig' | 'useCache'
> & {
  ignorePath?: string | string[]
  respectOxfmtDefaultIgnores?: boolean
  useConfig?: boolean
  withNodeModules?: boolean
}

/**
 * User-facing options accepted by the oxfmt rule.
 */
export type OxfmtRuleOptions = NonNullable<OxfmtRuleOptionsTuple[0]>

/**
 * Rule options plus the working directory supplied by ESLint.
 */
export type OxfmtWorkerOptions = OxfmtRuleOptions &
  Pick<LoadOxfmtConfigOptions, 'cwd'>

export interface PluginOxfmt {
  configs: {
    cliParity: Linter.Config<Linter.RulesRecord>
    recommended: Linter.Config<Linter.RulesRecord>
    recommendedWithoutParser: Linter.Config<Linter.RulesRecord>
  }
  meta: {
    name: string
    version: string
  }
  rules: {
    oxfmt: Rule.RuleModule
  }
}

/**
 * Legacy option type retained for source compatibility.
 *
 * @deprecated Use OxfmtRuleOptions for rule configuration or OxfmtWorkerOptions for worker calls.
 */
export type RuleOxfmtOptions = LoadOxfmtConfigOptions &
  OxfmtOptions &
  OxfmtPluginOptions

/**
 * Oxfmt format result returned by the worker
 */
export type WorkerFormatResult =
  | (FormatResult & { ignored?: false })
  | {
      code: string
      ignored: true
      errors?: never
      reason?: OxfmtIgnoreReason
    }

/**
 * Oxfmt format result
 */
type FormatResult = Awaited<ReturnType<typeof format>>

/**
 * Oxfmt ignore reason
 */
type OxfmtIgnoreReason = IsOxfmtIgnoredResult['reason']
