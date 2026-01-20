import { join } from 'node:path'
import { createSyncFn } from 'synckit'
import { dirWorkers } from '../dir'
import { messages, reportDifferences } from '../reporter'
import { sharedSchema } from '../schema'
import type { Rule } from 'eslint'
import type { Options as LoadOxfmtConfigOptions } from 'load-oxfmt-config'
import type { format, FormatOptions } from 'oxfmt'

type FormatResult = Awaited<ReturnType<typeof format>>
type Options = FormatOptions & LoadOxfmtConfigOptions

let formatViaOxfmt: (
  filename: string,
  sourceText: string,
  options?: Options,
) => FormatResult

export const oxfmt: Rule.RuleModule = {
  meta: {
    defaultOptions: [],
    fixable: 'code',
    messages,
    type: 'layout',
    docs: {
      description: 'Format code via oxfmt',
      recommended: true,
      url: 'https://github.com/ntnyq/eslint-plugin-oxfmt',
    },
    schema: [
      {
        additionalProperties: false,
        type: 'object',
        definitions: {
          FormatConfig: {
            additionalProperties: false,
            type: 'object',
            properties: {
              ...sharedSchema.properties,
            },
          },
          OxfmtOverrideConfig: {
            additionalProperties: false,
            required: ['files'],
            type: 'object',
            properties: {
              excludeFiles: {
                description: `Glob patterns to exclude from this override.`,
                type: 'array',
                items: {
                  type: 'string',
                },
              },
              files: {
                description: `Glob patterns to match files for this override.\nAll patterns are relative to the Oxfmt configuration file.`,
                type: 'array',
                items: {
                  type: 'string',
                },
              },
              options: {
                $ref: '#/definitions/FormatConfig',
                description: `Format options to apply for matched files.`,
                type: 'object',
              },
            },
          },
        },
        properties: {
          ...sharedSchema.properties,
          overrides: {
            description: `File-specific overrides.\nWhen a file matches multiple overrides, the later override takes precedence (array order matters).\n\n- (Default: [])`,
            type: 'array',
            items: {
              $ref: '#/definitions/OxfmtOverrideConfig',
            },
          },
        },
      },
    ],
  },
  create(context) {
    if (!formatViaOxfmt) {
      formatViaOxfmt = createSyncFn(join(dirWorkers, 'oxfmt.mjs'))
    }

    return {
      Program() {
        const sourceText = context.sourceCode.text

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
                  message: error.message,
                })
              } else {
                context.report({
                  message: error.message,
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
            message: `Failed to format file ${context.filename}`,
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
