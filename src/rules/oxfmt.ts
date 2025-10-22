import { join } from 'node:path'
import { createSyncFn } from 'synckit'
import { dirWorkers } from '../dir'
import { messages, reportDifferences } from '../reporter'
import type { Rule } from 'eslint'
import type { format, FormatOptions } from 'oxfmt'

type FormatResult = Awaited<ReturnType<typeof format>>

let formatViaOxfmt: (
  filename: string,
  sourceText: string,
  options?: FormatOptions,
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
        properties: {
          arrowParens: {
            description: `Include parentheses around a sole arrow function parameter. (Default: "always")`,
            enum: ['always', 'avoid'],
            type: 'string',
          },
          bracketSameLine: {
            description: `Put the > of a multi-line JSX element at the end of the last line\ninstead of being alone on the next line. (Default: false)`,
            type: 'boolean',
          },
          bracketSpacing: {
            description: `Print spaces between brackets in object literals. (Default: true)`,
            type: 'boolean',
          },
          embeddedLanguageFormatting: {
            description: `Control whether formats quoted code embedded in the file. (Default: "auto")`,
            enum: ['auto', 'off'],
            type: 'string',
          },
          endOfLine: {
            description: `Which end of line characters to apply. (Default: "lf")`,
            enum: ['lf', 'crlf', 'cr'],
            type: 'string',
          },
          // experimentalTernaries: {
          //   description: `Experimental: How to format ternary expressions. (Default: "always-multiline")`,
          //   type: 'string',
          // },
          // experimentalOperatorPosition: {
          //   description: `Experimental: Position of operators in expressions. (Default: \"end\")`,
          //   enum: ['end'],
          //   type: 'string',
          // },
          experimentalSortImports: {
            additionalProperties: false,
            description: `Experimental: Sort import statements. Disabled by default.`,
            type: 'object',
            properties: {
              groups: {
                description: `Custom groups configuration for organizing imports.\nEach array element represents a group, and multiple group names in the same array are treated as one.\nAccepts both string and string[] as group elements.`,
                type: 'array',
                items: {
                  type: 'array',
                  items: {
                    type: 'string',
                  },
                },
              },
              ignoreCase: {
                description: `Ignore case when sorting. (Default: true)`,
                type: 'boolean',
              },
              internalPattern: {
                description: `Glob patterns to identify internal imports.`,
                type: 'array',
                items: {
                  type: 'string',
                },
              },
              newlinesBetween: {
                description: `Add newlines between import groups. (Default: true)`,
                type: 'boolean',
              },
              order: {
                description: `Sort order. (Default: "asc")`,
                enum: ['asc', 'desc'],
                type: 'string',
              },
              partitionByComment: {
                description: `Partition imports by comments. (Default: false)`,
                type: 'boolean',
              },
              partitionByNewline: {
                description: `Partition imports by newlines. (Default: false)`,
                type: 'boolean',
              },
              sortSideEffects: {
                description: `Sort side-effect imports. (Default: "false")`,
                type: 'boolean',
              },
            },
          },
          experimentalSortPackageJson: {
            description: `Experimental: Sort package.json keys. (Default: true)`,
            type: 'boolean',
          },
          ignorePatterns: {
            description: `Ignore files matching these glob patterns. Current working directory is used as the root.`,
            type: 'array',
            items: {
              type: 'string',
            },
          },
          jsxSingleQuote: {
            description: `Use single quotes instead of double quotes in JSX. (Default: false)`,
            type: 'boolean',
          },
          objectWrap: {
            description: `How to wrap object literals when they could fit on one line or span multiple lines. (Default: "preserve")\nNOTE: In addition to Prettier's "preserve" and "collapse", we also support "always".`,
            enum: ['preserve', 'collapse', 'always'],
            type: 'string',
          },
          printWidth: {
            description: `The line length that the printer will wrap on. (Default: 100)`,
            type: 'integer',
          },
          quoteProps: {
            description: `Change when properties in objects are quoted. (Default: "as-needed")`,
            enum: ['as-needed', 'consistent', 'preserve'],
            type: 'string',
          },
          semi: {
            description: `Print semicolons at the ends of statements. (Default: true)`,
            type: 'boolean',
          },
          singleAttributePerLine: {
            description: `Put each attribute on a new line in JSX. (Default: false)`,
            type: 'boolean',
          },
          singleQuote: {
            description: `Use single quotes instead of double quotes. (Default: false)`,
            type: 'boolean',
          },
          tabWidth: {
            description: `Number of spaces per indentation level. (Default: 2)`,
            type: 'integer',
          },
          trailingComma: {
            description: `Print trailing commas wherever possible. (Default: "all")`,
            enum: ['all', 'es5', 'none'],
            type: 'string',
          },
          useTabs: {
            description: `Use tabs for indentation or spaces. (Default: false)`,
            type: 'boolean',
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
