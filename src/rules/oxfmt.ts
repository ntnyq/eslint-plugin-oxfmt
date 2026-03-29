import { join } from 'node:path'
import { createSyncFn } from 'synckit'
import { dirWorkers } from '../dir'
import { messages, reportDifferences } from '../reporter'
import { oxfmtRuleSchema } from '../schema'
import type { Rule } from 'eslint'
import type { Options as LoadOxfmtConfigOptions } from 'load-oxfmt-config'
import type { format, FormatConfig } from 'oxfmt'

type FormatResult = Awaited<ReturnType<typeof format>>
type Options = FormatConfig & LoadOxfmtConfigOptions

let formatViaOxfmt: (
  filename: string,
  sourceText: string,
  options?: Options,
) => FormatResult

export const oxfmt: Rule.RuleModule = {
  meta: {
    defaultOptions: [],
    fixable: 'whitespace',
    messages,
    schema: [oxfmtRuleSchema],
    type: 'layout',
    docs: {
      description: 'Format code via oxfmt',
      recommended: true,
      url: 'https://github.com/ntnyq/eslint-plugin-oxfmt',
    },
  },
  create(context) {
    // Skip processor-extracted virtual files.
    // When ESLint processors (e.g. angular-eslint's processInlineTemplates)
    // extract parts of a file, context.filename is a virtual path while
    // context.physicalFilename is the real on-disk path.
    // Since oxfmt already formats inline templates as part of the parent
    // file, formatting the extracted fragment separately would produce
    // conflicting results (ping-pong).
    const physicalFilename = context.physicalFilename ?? context.filename
    if (context.filename !== physicalFilename) {
      return {}
    }

    if (!formatViaOxfmt) {
      formatViaOxfmt = createSyncFn(join(dirWorkers, 'oxfmt.mjs'))
    }

    const sourceText = context.sourceCode.text

    return {
      [context.sourceCode.ast.type || 'Program']() {
        try {
          const formatResult = formatViaOxfmt(context.filename, sourceText, {
            ...context.options?.[0],
            cwd: context.cwd,
          })

          if (formatResult.errors?.length) {
            for (const error of formatResult.errors) {
              const label = error.labels?.[0]
              if (label) {
                const start = context.sourceCode.getLocFromIndex(label.start)
                const end = context.sourceCode.getLocFromIndex(label.end)
                context.report({
                  loc: { end, start },
                  message: `Failed to format code: ${error.message}`,
                })
              } else {
                context.report({
                  message: `Failed to format code: ${error.message}`,
                  loc: {
                    end: { column: 0, line: 1 },
                    start: { column: 0, line: 1 },
                  },
                })
              }
            }
          } else {
            reportDifferences(context, sourceText, formatResult.code)
          }
        } catch {
          context.report({
            message: `Failed to format file: ${context.filename}`,
            loc: {
              end: { column: 0, line: 1 },
              start: { column: 0, line: 1 },
            },
          })
        }
      },
    }
  },
}
