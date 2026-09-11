import * as eslintParserPlain from 'eslint-parser-plain'
import type { Linter } from 'eslint'

// re-export `eslint-parser-plain` with type
const parserPlain: Linter.Parser = eslintParserPlain

export { parserPlain }
