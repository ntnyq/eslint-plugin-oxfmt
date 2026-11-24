import { readFile } from 'node:fs/promises'
import { extname } from 'node:path'
import {
  isEmptyString,
  isNullOrUndefined,
  isString,
  isUndefined,
} from '@ntnyq/utils'
import { parse as parseJSONC, printParseErrorCode } from 'jsonc-parser'
import { isConfigObject, loadConfigModule } from './config-module'
import { OXFMT_MODULE_CONFIG_EXTENSIONS } from './constants'
import type { ParseError } from 'jsonc-parser'
import type { OxfmtOptions } from './types'

/**
 * Read and parse an oxfmt config file.
 *
 * @param resolvedPath - Absolute path to config file.
 * @param options - Config loading options.
 * @param options.useCache - Whether to reuse cached config modules.
 * @param options.useCliConfig - Whether to accept comments and trailing commas in JSON files.
 * @returns Parsed config object.
 */
export async function readConfigFromFile(
  resolvedPath: string,
  options: { useCache?: boolean; useCliConfig?: boolean } = {},
): Promise<OxfmtOptions> {
  const extension = extname(resolvedPath)
  const useCache = options.useCache !== false

  if (OXFMT_MODULE_CONFIG_EXTENSIONS.includes(extension)) {
    return loadConfigModule(resolvedPath, useCache, config =>
      validateOverrides(config.overrides),
    )
  }

  const content = (await readFile(resolvedPath, 'utf8')).replace(
    /^\u{FEFF}/u,
    '',
  )

  if (
    extension === '.jsonc' ||
    (options.useCliConfig && extension === '.json')
  ) {
    const parseErrors: ParseError[] = []
    const parsed = parseJSONC(content, parseErrors, {
      allowEmptyContent: extension === '.jsonc',
      allowTrailingComma: true,
    })

    if (parseErrors.length > 0) {
      const firstError = parseErrors[0]
      const errorCode = isUndefined(firstError)
        ? 'Unknown'
        : printParseErrorCode(firstError.error)

      throw new Error(`Invalid JSONC syntax: ${errorCode}`)
    }

    const config =
      isUndefined(parsed) && isEmptyString(content.trim()) ? {} : parsed

    return readParsedConfigObject(config)
  }

  if (extension === '.json' || !extension) {
    return readParsedConfigObject(JSON.parse(content))
  }

  throw new Error(
    `Unsupported oxfmt config extension "${extension}" at ${resolvedPath}`,
  )
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

  validateOverrides(config.overrides)

  return config
}

/**
 * Reject malformed external overrides before consumers iterate or merge them.
 * Formatter option values remain validated by oxfmt when formatting.
 */
function validateOverrides(overrides: unknown) {
  if (isNullOrUndefined(overrides)) {
    return
  }

  if (!Array.isArray(overrides)) {
    throw new TypeError('Invalid overrides: expected an array.')
  }

  for (const [index, override] of overrides.entries()) {
    const location = `overrides[${index}]`

    if (!isConfigObject(override)) {
      throw new TypeError(`Invalid ${location}: expected an object.`)
    }

    for (const key of ['files', 'excludeFiles'] as const) {
      const patterns: unknown = Reflect.get(override, key)

      if (key === 'excludeFiles' && isUndefined(patterns)) {
        continue
      }

      if (
        !Array.isArray(patterns) ||
        !patterns.every(pattern => isString(pattern))
      ) {
        throw new TypeError(
          `Invalid ${location}.${key}: expected an array of strings.`,
        )
      }
    }

    const overrideOptions: unknown = Reflect.get(override, 'options')

    if (!isUndefined(overrideOptions) && !isConfigObject(overrideOptions)) {
      throw new TypeError(`Invalid ${location}.options: expected an object.`)
    }
  }
}
