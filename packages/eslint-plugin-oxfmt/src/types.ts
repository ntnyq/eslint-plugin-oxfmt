import type { Linter, Rule } from 'eslint'
import type {
  IsOxfmtIgnoredResult,
  LoadOxfmtConfigOptions,
} from 'load-oxfmt-config'
import type { format, FormatConfig } from 'oxfmt'

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
 * Options for the oxfmt rule
 */
export type RuleOxfmtOptions = FormatConfig &
  LoadOxfmtConfigOptions & {
    disableNestedConfig?: boolean
    ignorePath?: string | string[]
    respectOxfmtDefaultIgnores?: boolean
    useConfig?: boolean
    withNodeModules?: boolean
  }

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
