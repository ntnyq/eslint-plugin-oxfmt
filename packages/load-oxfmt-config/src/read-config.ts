import { readFile } from 'node:fs/promises'
import { extname } from 'node:path'
import { isUndefined } from '@ntnyq/utils'
import { parse as parseJSONC, printParseErrorCode } from 'jsonc-parser'
import { isConfigObject, loadConfigModule } from './config-module'
import { OXFMT_EXPLICIT_CONFIG_EXTENSIONS } from './constants'
import type { ParseError } from 'jsonc-parser'
import type { OxfmtOptions } from './types'

/**
 * Read and parse an oxfmt config file.
 *
 * @param resolvedPath - Absolute path to config file.
 * @param options - Config loading options.
 * @param options.useCache - Whether to reuse cached config modules.
 * @returns Parsed config object.
 */
export async function readConfigFromFile(
  resolvedPath: string,
  options: { useCache?: boolean } = {},
): Promise<OxfmtOptions> {
  const extension = extname(resolvedPath)
  const useCache = options.useCache !== false

  if (['.cjs', '.cts', '.js', '.mjs', '.mts', '.ts'].includes(extension)) {
    return loadConfigModule(resolvedPath, useCache)
  }

  const content = (await readFile(resolvedPath, 'utf8')).replace(
    /^\u{FEFF}/u,
    '',
  )

  if (extension === '.jsonc') {
    const parseErrors: ParseError[] = []
    const parsed = parseJSONC(content, parseErrors, {
      allowEmptyContent: true,
      allowTrailingComma: true,
    })
    if (parseErrors.length > 0) {
      const firstError = parseErrors[0]
      const errorCode = isUndefined(firstError)
        ? 'Unknown'
        : printParseErrorCode(firstError.error)
      throw new Error(`Invalid JSONC syntax: ${errorCode}`)
    }

    const config = isUndefined(parsed) && content.trim() === '' ? {} : parsed
    return readParsedConfigObject(config)
  }

  if (extension === '.json') {
    return readParsedConfigObject(JSON.parse(content))
  }

  if (!extension) {
    return readParsedConfigObject(JSON.parse(content))
  }

  if (!OXFMT_EXPLICIT_CONFIG_EXTENSIONS.includes(extension)) {
    throw new Error(
      `Unsupported oxfmt config extension "${extension}" at ${resolvedPath}`,
    )
  }

  return readParsedConfigObject(JSON.parse(content))
}

/**
 * Read a parsed JSON-like config value as an oxfmt config object.
 *
 * @param config - Runtime config value.
 * @returns Oxfmt config object.
 * @throws When the config value is not an object.
 */
function readParsedConfigObject(config: unknown): OxfmtOptions {
  if (!isConfigObject(config)) {
    throw new Error('Configuration file must be an object.')
  }

  return config
}
