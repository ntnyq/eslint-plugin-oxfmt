import type { JSONSchema4 } from 'json-schema'

export const oxfmtOptionsSchema: JSONSchema4 = {
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
      description: `Control whether to format embedded parts (For example, CSS-in-JS, or JS-in-Vue, etc.) in the file.\n\nNOTE: XXX-in-JS support is incomplete.\n\n- (Default: "auto")`,
      enum: ['auto', 'off'],
      type: 'string',
    },
    endOfLine: {
      description: `Which end of line characters to apply. (Default: "lf")`,
      enum: ['lf', 'crlf', 'cr'],
      type: 'string',
    },
    experimentalSortImports: {
      additionalProperties: false,
      description: `Experimental: Sort import statements. Disabled by default.`,
      type: 'object',
      properties: {
        customGroups: {
          description: `Define your own groups for matching very specific imports.\n\nThe customGroups list is ordered: The first definition that matches an element will be used.\nCustom groups have a higher priority than any predefined group.\n\nIf you want a predefined group to take precedence over a custom group,\nyou must write a custom group definition that does the same as what the predefined group does, and put it first in the list.\n\n- (Default: [])`,
          type: 'array',
          items: {
            additionalProperties: false,
            type: 'object',
            properties: {
              elementNamePattern: {
                description: `List of glob patterns to match import sources for this group.`,
                type: 'array',
                items: {
                  type: 'string',
                },
              },
              groupName: {
                description: `Name of the custom group, used in the groups option.`,
                type: 'string',
              },
            },
          },
        },
        groups: {
          description: `Specifies a list of predefined import groups for sorting.\n\nEach import will be assigned a single group specified in the groups option (or the unknown group if no match is found).\nThe order of items in the groups option determines how groups are ordered.\n\nWithin a given group, members will be sorted according to the type, order, ignoreCase, etc. options.\n\nIndividual groups can be combined together by placing them in an array.\nThe order of groups in that array does not matter.\nAll members of the groups in the array will be sorted together as if they were part of a single group.\n\nPredefined groups are characterized by a single selector and potentially multiple modifiers.\nYou may enter modifiers in any order, but the selector must always come at the end.\n\nThe list of selectors is sorted from most to least important:\n- type — TypeScript type imports.\n- side-effect-style — Side effect style imports.\n- side-effect — Side effect imports.\n- style — Style imports.\n- index — Main file from the current directory.\n- sibling — Modules from the same directory.\n- parent — Modules from the parent directory.\n- subpath — Node.js subpath imports.\n- internal — Your internal modules.\n- builtin — Node.js Built-in Modules.\n- external — External modules installed in the project.\n- import — Any import.\n\nThe list of modifiers is sorted from most to least important:\n- side-effect — Side effect imports.\n- type — TypeScript type imports.\n- value — Value imports.\n- default — Imports containing the default specifier.\n- wildcard — Imports containing the wildcard (* as) specifier.\n- named — Imports containing at least one named specifier.\n- multiline — Imports on multiple lines.\n- singleline — Imports on a single line.\n\nSee also <https://perfectionist.dev/rules/sort-imports#groups> for details.\n\n- (Default: See below\njson\n[\n"type-import",\n["value-builtin", "value-external"],\n"type-internal",\n"value-internal",\n["type-parent", "type-sibling", "type-index"],\n["value-parent", "value-sibling", "value-index"],\n"unknown",\n])`,
          type: 'array',
          items: {
            anyOf: [
              {
                type: 'string',
              },
              {
                type: 'array',
                items: {
                  type: 'string',
                },
              },
            ],
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
          description: `Sort side-effect imports. (Default: false)`,
          type: 'boolean',
        },
      },
    },
    experimentalSortPackageJson: {
      description: `Experimental: Sort package.json keys. (Default: true)`,
      oneOf: [
        {
          type: 'boolean',
        },
        {
          additionalProperties: false,
          type: 'object',
          properties: {
            sortScripts: {
              description: `Sort the scripts field alphabetically. (Default: false)`,
              type: 'boolean',
            },
          },
        },
      ],
    },
    experimentalTailwindcss: {
      additionalProperties: false,
      description: `Experimental: Enable Tailwind CSS class sorting in JSX class/className attributes.\nWhen enabled, class strings will be collected and passed to a callback for sorting.\nPass an object with options from "prettier-plugin-tailwindcss".\n\n- (Default: disabled)`,
      type: 'object',
      properties: {
        attributes: {
          description: `List of additional attributes to sort beyond "class" and "className" (exact match).\n\nNOTE: Regex patterns are not yet supported.\n\n- (Default: [])\n- Example: ["myClassProp", ":class"]`,
          type: 'array',
          items: {
            type: 'string',
          },
        },
        config: {
          description: `Path to your Tailwind CSS configuration file (v3).\n\nNote: Paths are resolved relative to the Oxfmt configuration file.\n\n- (Default: "./tailwind.config.js")`,
          type: 'string',
        },
        functions: {
          description: `List of custom function names whose arguments should be sorted (exact match).\n\nNOTE: Regex patterns are not yet supported.\n\n- (Default: [])\n- Example: ["clsx", "cn", "cva", "tw"]`,
          type: 'array',
          items: {
            type: 'string',
          },
        },
        preserveDuplicates: {
          description: `Preserve duplicate classes.\n\n- (Default: false)`,
          type: 'boolean',
        },
        preserveWhitespace: {
          description: `Preserve whitespace around classes.\n\n- (Default: false)`,
          type: 'boolean',
        },
        stylesheet: {
          description: `Path to your Tailwind CSS stylesheet (v4).\n\nNote: Paths are resolved relative to the Oxfmt configuration file.\n\n- (Example: "./src/app.css")`,
          type: 'string',
        },
      },
    },
    htmlWhitespaceSensitivity: {
      description: `Specify the global whitespace sensitivity for HTML, Vue, Angular, and Handlebars.\n\n- (Default: "css")`,
      enum: ['css', 'ignore', 'strict'],
      type: 'string',
    },
    ignorePatterns: {
      description: `Ignore files matching these glob patterns. Current working directory is used as the root.`,
      type: 'array',
      items: {
        type: 'string',
      },
    },
    insertFinalNewline: {
      description: `Whether to insert a final newline at the end of the file. (Default: true)`,
      type: 'boolean',
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
    proseWrap: {
      description: `How to wrap prose.\n\nBy default, formatter will not change wrapping in markdown text since some services use a linebreak-sensitive renderer, e.g. GitHub comments and BitBucket.\nTo wrap prose to the print width, change this option to "always".\nIf you want to force all prose blocks to be on a single line and rely on editor/viewer soft wrapping instead, you can use "never".\n\n- (Default: "preserve")`,
      enum: ['always', 'never', 'preserve'],
      type: 'string',
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
    vueIndentScriptAndStyle: {
      description: `Whether or not to indent the code inside <script> and <style> tags in Vue files.\n\n- (Default: false)`,
      type: 'boolean',
    },
  },
}

export const oxfmtConfigSchema: JSONSchema4 = {
  additionalProperties: false,
  type: 'object',
  properties: {
    configPath: {
      description: `Path to Oxfmt configuration file.\nIf you provide an absolute path, Oxfmt will use it directly.\n If not provided, Oxfmt will search for configuration files starting from the current working directory upwards.\n\n- (Default: undefined)`,
      type: 'string',
    },
    useConfig: {
      description: `Whether to load Oxfmt configuration file.\n\n- (Default: true)`,
      type: 'boolean',
    },
  },
}

export const oxfmtRuleSchema: JSONSchema4 = {
  additionalProperties: false,
  type: 'object',
  properties: {
    ...oxfmtOptionsSchema.properties,
    ...oxfmtConfigSchema.properties,
    overrides: {
      description: `File-specific overrides.\nWhen a file matches multiple overrides, the later override takes precedence (array order matters).\n\n- (Default: [])`,
      type: 'array',
      items: {
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
            additionalProperties: false,
            description: `Format options to apply for matched files.`,
            type: 'object',
            properties: {
              ...oxfmtOptionsSchema.properties,
            },
          },
        },
      },
    },
  },
}
