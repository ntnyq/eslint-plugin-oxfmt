/* eslint-disable */
/* prettier-ignore */
import type { Linter } from 'eslint'

export type RuleOptions = {
  /**
   * Format code via oxfmt
   * @see https://github.com/ntnyq/eslint-plugin-oxfmt
   */
  'oxfmt/oxfmt'?: Linter.RuleEntry<OxfmtOxfmt>
}

/* ======= Declarations ======= */
// ----- oxfmt/oxfmt -----
export type OxfmtRuleOptionsTuple = []|[{

  arrowParens?: ("always" | "avoid")

  astro?: (boolean | {

    allowShorthand?: boolean

    compressHTML?: ("jsx" | "html" | "none")

    skipFrontmatter?: boolean
  })

  bracketSameLine?: boolean

  bracketSpacing?: boolean

  embeddedLanguageFormatting?: ("auto" | "off")

  endOfLine?: ("lf" | "crlf" | "cr")

  experimentalOperatorPosition?: ("start" | "end")

  htmlWhitespaceSensitivity?: ("css" | "ignore" | "strict")

  ignorePatterns?: string[]

  insertFinalNewline?: boolean

  jsdoc?: (boolean | {

    addDefaultToDescription?: boolean

    bracketSpacing?: boolean

    capitalizeDescriptions?: boolean

    commentLineStrategy?: ("singleLine" | "multiline" | "keep")

    descriptionTag?: boolean

    descriptionWithDot?: boolean

    keepUnparsableExampleIndent?: boolean

    lineWrappingStyle?: ("greedy" | "balance")

    preferCodeFences?: boolean

    separateReturnsFromParam?: boolean

    separateTagGroups?: boolean
  })

  jsxSingleQuote?: boolean

  objectWrap?: ("preserve" | "collapse")

  printWidth?: number

  proseWrap?: ("always" | "never" | "preserve")

  quoteProps?: ("as-needed" | "consistent" | "preserve")

  semi?: boolean

  singleAttributePerLine?: boolean

  singleQuote?: boolean

  sortImports?: (boolean | {

    customGroups?: {

      elementNamePattern?: string[]

      groupName?: string

      modifiers?: ("default" | "named" | "side_effect" | "type" | "value" | "wildcard")[]

      selector?: ("builtin" | "external" | "import" | "index" | "internal" | "parent" | "sibling" | "side_effect" | "side_effect_style" | "style" | "subpath" | "type")
    }[]

    groups?: (string | string[] | {

      newlinesBetween: boolean
    })[]

    ignoreCase?: boolean

    internalPattern?: string[]

    newlinesBetween?: boolean

    order?: ("asc" | "desc")

    partitionByComment?: boolean

    partitionByNewline?: boolean

    sortSideEffects?: boolean
  })

  sortPackageJson?: (boolean | {

    sortScripts?: boolean
  })

  sortTailwindcss?: (boolean | {

    attributes?: string[]

    config?: string

    functions?: string[]

    preserveDuplicates?: boolean

    preserveWhitespace?: boolean

    stylesheet?: string
  })

  svelte?: (boolean | {

    allowShorthand?: boolean

    indentScriptAndStyle?: boolean

    sortOrder?: string
  })

  tabWidth?: number

  trailingComma?: ("all" | "es5" | "none")

  useTabs?: boolean

  vueIndentScriptAndStyle?: boolean

  configPath?: string

  disableNestedConfig?: boolean

  editorconfig?: (boolean | {

    cwd?: string

    onlyCwd?: boolean
  })

  ignorePath?: (string | string[])

  respectOxfmtDefaultIgnores?: boolean

  useCache?: boolean

  useConfig?: boolean

  withNodeModules?: boolean

  associations?: {

    excludeFiles?: string[]

    files: string[]

    language: ("javascript" | "jsx" | "typescript" | "tsx" | "json" | "jsonc" | "json5" | "css" | "scss" | "less" | "graphql" | "yaml" | "markdown" | "toml" | "html" | "angular-html" | "vue" | "svelte" | "astro" | "handlebars" | "mdx")
  }[]

  overrides?: {

    excludeFiles?: string[]

    files: string[]

    options?: {

      arrowParens?: ("always" | "avoid")

      astro?: (boolean | {

        allowShorthand?: boolean

        compressHTML?: ("jsx" | "html" | "none")

        skipFrontmatter?: boolean
      })

      bracketSameLine?: boolean

      bracketSpacing?: boolean

      embeddedLanguageFormatting?: ("auto" | "off")

      endOfLine?: ("lf" | "crlf" | "cr")

      experimentalOperatorPosition?: ("start" | "end")

      htmlWhitespaceSensitivity?: ("css" | "ignore" | "strict")

      insertFinalNewline?: boolean

      jsdoc?: (boolean | {

        addDefaultToDescription?: boolean

        bracketSpacing?: boolean

        capitalizeDescriptions?: boolean

        commentLineStrategy?: ("singleLine" | "multiline" | "keep")

        descriptionTag?: boolean

        descriptionWithDot?: boolean

        keepUnparsableExampleIndent?: boolean

        lineWrappingStyle?: ("greedy" | "balance")

        preferCodeFences?: boolean

        separateReturnsFromParam?: boolean

        separateTagGroups?: boolean
      })

      jsxSingleQuote?: boolean

      objectWrap?: ("preserve" | "collapse")

      printWidth?: number

      proseWrap?: ("always" | "never" | "preserve")

      quoteProps?: ("as-needed" | "consistent" | "preserve")

      semi?: boolean

      singleAttributePerLine?: boolean

      singleQuote?: boolean

      sortImports?: (boolean | {

        customGroups?: {

          elementNamePattern?: string[]

          groupName?: string

          modifiers?: ("default" | "named" | "side_effect" | "type" | "value" | "wildcard")[]

          selector?: ("builtin" | "external" | "import" | "index" | "internal" | "parent" | "sibling" | "side_effect" | "side_effect_style" | "style" | "subpath" | "type")
        }[]

        groups?: (string | string[] | {

          newlinesBetween: boolean
        })[]

        ignoreCase?: boolean

        internalPattern?: string[]

        newlinesBetween?: boolean

        order?: ("asc" | "desc")

        partitionByComment?: boolean

        partitionByNewline?: boolean

        sortSideEffects?: boolean
      })

      sortPackageJson?: (boolean | {

        sortScripts?: boolean
      })

      sortTailwindcss?: (boolean | {

        attributes?: string[]

        config?: string

        functions?: string[]

        preserveDuplicates?: boolean

        preserveWhitespace?: boolean

        stylesheet?: string
      })

      svelte?: (boolean | {

        allowShorthand?: boolean

        indentScriptAndStyle?: boolean

        sortOrder?: string
      })

      tabWidth?: number

      trailingComma?: ("all" | "es5" | "none")

      useTabs?: boolean

      vueIndentScriptAndStyle?: boolean
    }
  }[]
}]

/**
 * Historical rule options with string-based custom group inputs preserved.
 */
export type OxfmtOxfmt = PreserveLegacyCustomGroupInputs<OxfmtRuleOptionsTuple>

type PreserveLegacyCustomGroupInputs<Options> = Options extends object
  ? {
      [Key in keyof Options]: Key extends 'selector'
        ? string
        : Key extends 'modifiers'
          ? string[]
          : PreserveLegacyCustomGroupInputs<Options[Key]>
    }
  : Options
