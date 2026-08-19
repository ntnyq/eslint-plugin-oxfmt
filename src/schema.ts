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
    experimentalOperatorPosition: {
      description: `When expressions wrap lines, print operators at the start of new lines ("start") or at the end of previous lines ("end").\n\n- Languages: JS, JSX, TS, TSX\n- (Default: "end")`,
      enum: ['start', 'end'],
      type: 'string',
    },
    htmlWhitespaceSensitivity: {
      description: `Specify the global whitespace sensitivity for HTML, Vue, Angular, and Handlebars.\n\n- (Default: "css")`,
      enum: ['css', 'ignore', 'strict'],
      type: 'string',
    },
    ignorePatterns: {
      description: `Ignore files matching these glob patterns. Rule-level ignorePatterns are resolved relative to ESLint cwd. Config ignorePatterns are resolved relative to the config file directory and reject parent-directory (\`..\`) path segments.`,
      type: 'array',
      items: {
        type: 'string',
      },
    },
    insertFinalNewline: {
      description: `Whether to insert a final newline at the end of the file. (Default: true)`,
      type: 'boolean',
    },
    jsdoc: {
      description: `Enable JSDoc comment formatting.\n\nWhen enabled, JSDoc comments are normalized and reformatted:\ntag aliases are canonicalized, descriptions are capitalized,\nlong lines are wrapped, and short comments are collapsed to single-line.\n\nPass an object (\`jsdoc: {}\`) to enable with defaults, or omit to disable.\n\n- (Default: Disabled)`,
      oneOf: [
        {
          type: 'boolean',
        },
        {
          additionalProperties: false,
          type: 'object',
          properties: {
            addDefaultToDescription: {
              description: `Append default values to \`@param\` descriptions (e.g. "Default is \`value\`").\n\n- (Default: true)`,
              type: 'boolean',
            },
            bracketSpacing: {
              description: `Add spaces inside JSDoc type braces: \`{string}\` → \`{ string }\`.\n\n- (Default: false)`,
              type: 'boolean',
            },
            capitalizeDescriptions: {
              description: `Capitalize the first letter of tag descriptions.\n\n- (Default: true)`,
              type: 'boolean',
            },
            commentLineStrategy: {
              description: `How to format comment blocks.\n\n- \`"singleLine"\` — Convert to single-line \`/** content */\` when possible.\n- \`"multiline"\` — Always use multi-line format.\n- \`"keep"\` — Preserve original formatting.\n\n- (Default: "singleLine")`,
              enum: ['singleLine', 'multiline', 'keep'],
              type: 'string',
            },
            descriptionTag: {
              description: `Emit \`@description\` tag instead of inline description.\n\n- (Default: false)`,
              type: 'boolean',
            },
            descriptionWithDot: {
              description: `Add a trailing dot to the end of descriptions.\n\n- (Default: false)`,
              type: 'boolean',
            },
            keepUnparsableExampleIndent: {
              description: `Preserve indentation in unparsable \`@example\` code.\n\n- (Default: false)`,
              type: 'boolean',
            },
            lineWrappingStyle: {
              description: `Strategy for wrapping description lines at print width.\n\n- \`"greedy"\` — Always re-wrap text to fit within print width.\n- \`"balance"\` — Preserve original line breaks if all lines fit within print width.\n\n- (Default: "greedy")`,
              enum: ['greedy', 'balance'],
              type: 'string',
            },
            preferCodeFences: {
              description: `Use fenced code blocks (\`\`\`) instead of 4-space indentation for code without a language tag.\n\n- (Default: false)`,
              type: 'boolean',
            },
            separateReturnsFromParam: {
              description: `Add a blank line between the last \`@param\` and \`@returns\`.\n\n- (Default: false)`,
              type: 'boolean',
            },
            separateTagGroups: {
              description: `Add blank lines between different tag groups (e.g. between \`@param\` and \`@returns\`).\n\n- (Default: false)`,
              type: 'boolean',
            },
          },
        },
      ],
    },
    jsxSingleQuote: {
      description: `Use single quotes instead of double quotes in JSX. (Default: false)`,
      type: 'boolean',
    },
    objectWrap: {
      description: `How to wrap object literals when they could fit on one line or span multiple lines. (Default: "preserve")`,
      enum: ['preserve', 'collapse'],
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
    sortImports: {
      description: `Experimental: Sort import statements. Disabled by default.`,
      oneOf: [
        {
          type: 'boolean',
        },
        {
          additionalProperties: false,
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
                  modifiers: {
                    description: `Modifiers to match the import characteristics.\nAll specified modifiers must be present (AND logic).\n\nPossible values: "side_effect", "type", "value", "default", "wildcard", "named"`,
                    type: 'array',
                    items: {
                      type: 'string',
                    },
                  },
                  selector: {
                    description: `Selector to match the import kind.\n\nPossible values: "type", "side_effect_style", "side_effect", "style", "index", "sibling", "parent", "subpath", "internal", "builtin", "external", "import"`,
                    type: 'string',
                  },
                },
              },
            },
            groups: {
              description: `Specifies a list of predefined import groups for sorting.\n\nEach import will be assigned a single group specified in the groups option (or the \`unknown\` group if no match is found).\nThe order of items in the \`groups\` option determines how groups are ordered.\n\nWithin a given group, members will be sorted according to the type, order, ignoreCase, etc. options.\n\nIndividual groups can be combined together by placing them in an array.\nThe order of groups in that array does not matter.\nAll members of the groups in the array will be sorted together as if they were part of a single group.\n\nPredefined groups are characterized by a single selector and potentially multiple modifiers.\nYou may enter modifiers in any order, but the selector must always come at the end.\n\nThe list of selectors is sorted from most to least important:\n- \`type\` — TypeScript type imports.\n- \`side_effect_style\` — Side effect style imports.\n- \`side_effect\` — Side effect imports.\n- \`style\` — Style imports.\n- \`index\` — Main file from the current directory.\n- \`sibling\` — Modules from the same directory.\n- \`parent\` — Modules from the parent directory.\n- \`subpath\` — Node.js subpath imports.\n- \`internal\` — Your internal modules.\n- \`builtin\` — Node.js Built-in Modules.\n- \`external\` — External modules installed in the project.\n- \`import\` — Any import.\n\nThe list of modifiers is sorted from most to least important:\n- \`side_effect\` — Side effect imports.\n- \`type\` — TypeScript type imports.\n- \`value\` — Value imports.\n- \`default\` — Imports containing the default specifier.\n- \`wildcard\` — Imports containing the wildcard (\`* as\`) specifier.\n- \`named\` — Imports containing at least one named specifier.\n\n- Default: See below\n\`\`\`json\n[\n\"builtin\",\n\"external\",\n[\"internal\", \"subpath\"],\n[\"parent\", \"sibling\", \"index\"],\n\"style\",\n\"unknown\"\n]\n\`\`\`\n\nAlso, you can override the global \`newlinesBetween\` setting for specific group boundaries\nby including a \`{ \"newlinesBetween\": boolean }\` marker object in the \`groups\` list at the desired position.`,
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
                  {
                    additionalProperties: false,
                    required: ['newlinesBetween'],
                    type: 'object',
                    properties: {
                      newlinesBetween: {
                        description: `A marker object for overriding \`newlinesBetween\` at a specific group boundary.`,
                        type: 'boolean',
                      },
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
      ],
    },
    sortPackageJson: {
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
    sortTailwindcss: {
      description: `Experimental: Enable Tailwind CSS class sorting in JSX class/className attributes.\nWhen enabled, class strings will be collected and passed to a callback for sorting.\nPass an object with options from "prettier-plugin-tailwindcss".\n\n- (Default: disabled)`,
      oneOf: [
        {
          type: 'boolean',
        },
        {
          additionalProperties: false,
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
      ],
    },
    svelte: {
      description: `Options for prettier-plugin-svelte.\nPass true or an object to enable .svelte file formatting, or false/omit to disable.\n\nNOTE: prettier-plugin-svelte requires the svelte package (svelte/compiler) at runtime.\n\n- (Default: disabled)`,
      oneOf: [
        {
          type: 'boolean',
        },
        {
          additionalProperties: false,
          type: 'object',
          properties: {
            allowShorthand: {
              description: `Whether to allow attribute shorthand if attribute name and expression are the same. (Default: true)`,
              type: 'boolean',
            },
            indentScriptAndStyle: {
              description: `Whether to indent code inside <script> and <style> tags in Svelte files. (Default: true)`,
              type: 'boolean',
            },
            sortOrder: {
              description: `The order in which Svelte sections are printed, e.g. "options-scripts-markup-styles", or "none" to keep order. (Default: "options-scripts-markup-styles")`,
              type: 'string',
            },
          },
        },
      ],
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

const oxfmtOverrideOptionsSchemaProperties = {
  ...oxfmtOptionsSchema.properties,
}
delete oxfmtOverrideOptionsSchemaProperties.ignorePatterns

export const oxfmtConfigSchema: JSONSchema4 = {
  additionalProperties: false,
  type: 'object',
  properties: {
    configPath: {
      description: `Path to Oxfmt configuration file.\nIf you provide an absolute path, Oxfmt will use it directly.\n If not provided, Oxfmt will search for configuration files starting from the current working directory upwards.\n\n- (Default: undefined)`,
      type: 'string',
    },
    disableNestedConfig: {
      default: false,
      description: `Disable nested config lookup and resolve from cwd/configPath only. (Default: false)`,
      type: 'boolean',
    },
    editorconfig: {
      description: `Control .editorconfig reading.\n- true: enable with default behavior.\n- false: disable .editorconfig reading.\n- object: enable with advanced options (onlyCwd/cwd).\n\n- (Default: true)`,
      oneOf: [
        {
          type: 'boolean',
        },
        {
          additionalProperties: false,
          type: 'object',
          properties: {
            cwd: {
              description: `Override directory used as the start point for .editorconfig resolution.`,
              type: 'string',
            },
            onlyCwd: {
              description: `When true, only read .editorconfig from cwd (no upward traversal).`,
              type: 'boolean',
            },
          },
        },
      ],
    },
    ignorePath: {
      description: `Path(s) to ignore files used for CLI-style ignore resolution. Accepts a single path or multiple paths. (Default: undefined)`,
      oneOf: [
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
    respectOxfmtDefaultIgnores: {
      default: true,
      description: `Whether to respect oxfmt default ignores (.gitignore, .prettierignore, lockfiles, default directories). (Default: true)`,
      type: 'boolean',
    },
    useConfig: {
      default: true,
      description: `Whether to load Oxfmt configuration file. (Default: true)`,
      type: 'boolean',
    },
    withNodeModules: {
      default: false,
      description: `Whether to include files inside node_modules during ignore resolution. (Default: false)`,
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
            description: `Glob patterns to match files for this override.\nWhen \`useConfig\` is true, patterns are resolved relative to the discovered/resolved Oxfmt config directory.\nWhen \`useConfig\` is false, patterns are resolved relative to ESLint cwd.`,
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
              ...oxfmtOverrideOptionsSchemaProperties,
            },
          },
        },
      },
    },
  },
}
