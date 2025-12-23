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
export type OxfmtOxfmt = []|[{
  
  arrowParens?: ("always" | "avoid")
  
  bracketSameLine?: boolean
  
  bracketSpacing?: boolean
  
  embeddedLanguageFormatting?: ("auto" | "off")
  
  endOfLine?: ("lf" | "crlf" | "cr")
  
  experimentalSortImports?: {
    
    groups?: string[][]
    
    ignoreCase?: boolean
    
    internalPattern?: string[]
    
    newlinesBetween?: boolean
    
    order?: ("asc" | "desc")
    
    partitionByComment?: boolean
    
    partitionByNewline?: boolean
    
    sortSideEffects?: boolean
  }
  
  experimentalSortPackageJson?: boolean
  
  ignorePatterns?: string[]
  
  insertFinalNewline?: boolean
  
  jsxSingleQuote?: boolean
  
  objectWrap?: ("preserve" | "collapse" | "always")
  
  printWidth?: number
  
  quoteProps?: ("as-needed" | "consistent" | "preserve")
  
  semi?: boolean
  
  singleAttributePerLine?: boolean
  
  singleQuote?: boolean
  
  tabWidth?: number
  
  trailingComma?: ("all" | "es5" | "none")
  
  useTabs?: boolean
}]