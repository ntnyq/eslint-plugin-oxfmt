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
      
      modifiers?: string[]
      
      selector?: string
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
  
  tabWidth?: number
  
  trailingComma?: ("all" | "es5" | "none")
  
  useTabs?: boolean
  
  vueIndentScriptAndStyle?: boolean
  
  configPath?: string
  
  useConfig?: boolean
  
  overrides?: {
    
    excludeFiles?: string[]
    
    files: string[]
    
    options?: {
      
      arrowParens?: ("always" | "avoid")
      
      bracketSameLine?: boolean
      
      bracketSpacing?: boolean
      
      embeddedLanguageFormatting?: ("auto" | "off")
      
      endOfLine?: ("lf" | "crlf" | "cr")
      
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
          
          modifiers?: string[]
          
          selector?: string
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
      
      tabWidth?: number
      
      trailingComma?: ("all" | "es5" | "none")
      
      useTabs?: boolean
      
      vueIndentScriptAndStyle?: boolean
    }
  }[]
}]