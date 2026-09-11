import { createHash } from 'node:crypto'
import { readFile, realpath, stat } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { extname, isAbsolute, join, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import {
  hasOwn,
  interopDefault,
  isObject,
  isString,
  isUndefined,
} from '@ntnyq/utils'
import { parse as parseJSONC, printParseErrorCode } from 'jsonc-parser'
import {
  OXFMT_CONFIG_FILES,
  OXFMT_EXPLICIT_CONFIG_EXTENSIONS,
} from './constants'
import { getCacheValue, setCacheValue, splitPathSegments } from './utils'
import type { ParseError } from 'jsonc-parser'
import type { OxfmtOptions } from './types'

/**
 * CommonJS require scoped to this ESM module for loading `.cjs` config files.
 */
const require = createRequire(import.meta.url)

/**
 * Node error codes that mean CommonJS require should fall back to ESM loading.
 */
const requireFallbackErrorCodes = new Set([
  'ERR_REQUIRE_ASYNC_MODULE',
  'ERR_REQUIRE_ESM',
])

/**
 * Syntax errors that indicate module syntax was parsed through CommonJS.
 */
const syntaxFallbackMessages = [
  /Cannot use import statement outside a module/u,
  /Unexpected token 'export'/u,
  /Unexpected token 'import'/u,
]

/**
 * ESM namespaces loaded from `.js` config files while bypassing normal caches.
 *
 * Node can load synchronous ESM through `require()`, but deleting
 * `require.cache` does not invalidate the ESM loader cache. Remember the entry
 * file version so changed configs can switch to a cache-busted native import
 * without evaluating the first load twice.
 */
const freshJavaScriptModuleCache = new Map<
  string,
  { cacheKey: string; namespace: Record<string, unknown> }
>()

/**
 * Build a cache key for config content; prefixes missing entries.
 *
 * @param resolvedPath - Resolved oxfmt config path.
 * @param editorconfigPath - Resolved editorconfig path.
 * @param resolveKey - Resolution cache key.
 * @returns Cache key for config content cache.
 */
export function getConfigCacheKey(
  resolvedPath: string | undefined,
  editorconfigPath: string | undefined,
  resolveKey: string,
): string {
  return JSON.stringify([
    resolvedPath ?? null,
    editorconfigPath ?? null,
    resolveKey,
  ])
}

/**
 * Build a cache key for path resolution (cwd + configPath).
 *
 * @param cwd - Current working directory.
 * @param configPath - Optional config path.
 * @returns Cache key for resolve cache.
 */
export function getResolveCacheKey(cwd: string, configPath?: string): string {
  return JSON.stringify([cwd, configPath ?? null])
}

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
    if (!useCache && extension === '.cjs') {
      return requireFreshCommonJSConfig(resolvedPath)
    }

    if (!useCache && extension === '.mjs') {
      const mod = await importNativeFreshModule(resolvedPath)
      return readConfigDefaultExport(mod)
    }

    if (!useCache && extension === '.js') {
      const mod = await importFreshJavaScriptConfigModule(resolvedPath)
      return readConfigDefaultExport(mod)
    }

    const mod = await importJitiConfigModule(resolvedPath, useCache)
    return readConfigDefaultExport(mod)
  }

  const content = await readFile(resolvedPath, 'utf8')

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
 * Resolve the oxfmt config file path.
 *
 * - If `configPath` is provided, absolute paths are returned as-is;
 *   relative paths are joined to `cwd`.
 * - Otherwise, walk upward from `cwd` to find known filenames.
 *
 * @param cwd - Starting directory for resolution.
 * @param configPath - Optional explicit path.
 * @returns Absolute path to config file, or undefined when not found.
 *
 * @example
 * ```ts
 * import { resolveOxfmtrcPath } from 'load-oxfmt-config'
 *
 * const path = await resolveOxfmtrcPath(process.cwd())
 * ```
 */
export async function resolveOxfmtrcPath(
  cwd: string,
  configPath?: string,
): Promise<string | undefined> {
  const resolvedCwd = resolve(cwd)

  if (configPath) {
    return isAbsolute(configPath) ? configPath : join(resolvedCwd, configPath)
  }

  let currentDir = resolvedCwd

  while (true) {
    for (const filename of OXFMT_CONFIG_FILES) {
      const configFilePath = join(currentDir, filename)

      try {
        const stats = await stat(configFilePath)
        if (stats.isFile()) {
          return configFilePath
        }
      } catch (error) {
        const code = (error as NodeJS.ErrnoException).code
        if (code !== 'ENOENT' && code !== 'ENOTDIR') {
          throw error
        }

        // File does not exist, continue searching.
      }
    }

    const parentDir = join(currentDir, '..')
    if (parentDir === currentDir) {
      break
    }

    currentDir = parentDir
  }

  return undefined
}

/**
 * Delete a CommonJS module and all cached children reachable from it.
 *
 * @param requirePath - Resolved CommonJS module id.
 * @param seen - Visited module ids used to avoid cycles.
 */
function deleteRequireCacheTree(requirePath: string, seen = new Set<string>()) {
  if (seen.has(requirePath)) {
    return
  }

  seen.add(requirePath)

  const cachedModule = require.cache[requirePath]
  if (cachedModule) {
    for (const child of cachedModule.children) {
      if (!splitPathSegments(child.id).includes('node_modules')) {
        deleteRequireCacheTree(child.id, seen)
      }
    }
  }

  Reflect.deleteProperty(require.cache, requirePath)
}

/**
 * Read a Node-style `code` field from an unknown thrown value.
 *
 * @param error - Thrown value to inspect.
 * @returns Error code when present.
 */
function getErrorCode(error: unknown): string | undefined {
  return isObject(error) && 'code' in error && isString(error.code)
    ? error.code
    : undefined
}

/**
 * Build a cache-busting import key from entry file contents.
 *
 * @param resolvedPath - Absolute config file path.
 * @returns Stable key that changes when the entry file contents change.
 */
async function getFreshImportCacheKey(resolvedPath: string) {
  const content = await readFile(resolvedPath)
  return createHash('sha256').update(content).digest('hex')
}

/**
 * Load a JavaScript config file without reusing stale module contents.
 *
 * This supports CommonJS, native ESM, and jiti fallback loading so package type
 * and syntax differences can be handled consistently.
 *
 * @param resolvedPath - Absolute `.js` config file path.
 * @returns Imported module namespace with a default config export.
 */
async function importFreshJavaScriptConfigModule(
  resolvedPath: string,
): Promise<Record<string, unknown>> {
  const canonicalPath = await realpath(resolvedPath)
  const loaderPaths =
    canonicalPath === resolvedPath
      ? [resolvedPath]
      : [resolvedPath, canonicalPath]
  const cacheKey = await getFreshImportCacheKey(resolvedPath)
  const cachedModule = getCacheValue(freshJavaScriptModuleCache, resolvedPath)
  if (cachedModule?.cacheKey === cacheKey) {
    return cachedModule.namespace
  }

  if (cachedModule) {
    const namespace = await importNativeFreshModule(resolvedPath)
    setCacheValue(freshJavaScriptModuleCache, resolvedPath, {
      cacheKey,
      namespace,
    })
    return namespace
  }

  try {
    const configModule = requireFreshModule(resolvedPath)
    if (Object.prototype.toString.call(configModule) === '[object Module]') {
      const namespace = configModule as Record<string, unknown>
      setCacheValue(freshJavaScriptModuleCache, resolvedPath, {
        cacheKey,
        namespace,
      })
      return namespace
    }

    return { default: readConfigModuleExports(configModule) }
  } catch (error) {
    if (!isJavaScriptLoaderFallbackError(error, loaderPaths)) {
      throw error
    }

    try {
      const namespace = await importNativeFreshModule(resolvedPath)
      setCacheValue(freshJavaScriptModuleCache, resolvedPath, {
        cacheKey,
        namespace,
      })
      return namespace
    } catch (importError) {
      if (!isJavaScriptLoaderFallbackError(importError, loaderPaths)) {
        throw importError
      }

      return importJitiConfigModule(resolvedPath, false)
    }
  }
}

/**
 * Import a JavaScript or TypeScript config module through jiti.
 *
 * @param resolvedPath - Absolute config file path to import.
 * @param useCache - Whether jiti should use its filesystem and module caches.
 * @returns Imported module namespace.
 */
async function importJitiConfigModule(
  resolvedPath: string,
  useCache: boolean,
): Promise<Record<string, unknown>> {
  const createJiti = await interopDefault(import('jiti'))
  const jiti = createJiti(
    import.meta.url,
    useCache ? undefined : { fsCache: false, moduleCache: false },
  )
  return jiti.import<Record<string, unknown>>(resolvedPath)
}

/**
 * Import an ESM config module with entry-file cache busting.
 *
 * @param resolvedPath - Absolute config file path to import.
 * @returns Imported module namespace.
 */
async function importNativeFreshModule(
  resolvedPath: string,
): Promise<Record<string, unknown>> {
  const url = pathToFileURL(resolvedPath)
  url.searchParams.set(
    'oxfmtConfigCacheBust',
    await getFreshImportCacheKey(resolvedPath),
  )
  return import(url.href) as Promise<Record<string, unknown>>
}

/**
 * Check whether an unknown config export is an object accepted by oxfmt.
 *
 * @param value - Runtime value to validate.
 * @returns True when the value can be treated as an oxfmt options object.
 */
function isConfigObject(value: unknown): value is OxfmtOptions {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return false
  }

  const prototype = Object.getPrototypeOf(value)
  return prototype === Object.prototype || prototype === null
}

/**
 * Check whether a loader error should continue the JS config fallback chain.
 *
 * @param error - Thrown value from require or native import.
 * @param resolvedPaths - Entry module paths that may appear in parser errors.
 * @returns True when the error is from loader compatibility, not config execution.
 */
function isJavaScriptLoaderFallbackError(
  error: unknown,
  resolvedPaths: string[],
): boolean {
  const code = getErrorCode(error)
  if (code && requireFallbackErrorCodes.has(code)) {
    return true
  }

  return (
    error instanceof SyntaxError &&
    resolvedPaths.some(
      resolvedPath => error.stack?.startsWith(`${resolvedPath}:`) === true,
    ) &&
    syntaxFallbackMessages.some(pattern => pattern.test(error.message))
  )
}

/**
 * Read the default export from a JavaScript or TypeScript config module.
 *
 * @param mod - Imported config module namespace.
 * @returns Oxfmt config object from the module default export.
 * @throws When the module has no default export or the default export is not an object.
 */
function readConfigDefaultExport(mod: Record<string, unknown>): OxfmtOptions {
  if (!hasOwn(mod, 'default')) {
    throw new Error('Configuration file has no default export.')
  }

  const config = mod.default

  if (!isConfigObject(config)) {
    throw new Error(
      'Configuration file must have a default export that is an object.',
    )
  }

  return config
}

/**
 * Read a CommonJS module export as an oxfmt config object.
 *
 * @param config - Runtime CommonJS export value.
 * @returns Oxfmt config object from the module export.
 * @throws When the module export is not an object.
 */
function readConfigModuleExports(config: unknown): OxfmtOptions {
  if (!isConfigObject(config)) {
    throw new Error('Configuration file must export an object.')
  }

  return config
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

/**
 * Load a CommonJS config file without reusing Node's require cache.
 *
 * @param resolvedPath - Absolute `.cjs` config file path.
 * @returns Oxfmt config object from default or module exports.
 */
function requireFreshCommonJSConfig(resolvedPath: string): OxfmtOptions {
  const configModule = requireFreshModule(resolvedPath)
  if (Object.prototype.toString.call(configModule) === '[object Module]') {
    return readConfigDefaultExport(configModule as Record<string, unknown>)
  }

  return readConfigModuleExports(configModule)
}

/**
 * Require a CommonJS module after removing it from Node's require cache.
 *
 * @param resolvedPath - Absolute config file path to require.
 * @returns Runtime module export value.
 */
function requireFreshModule(resolvedPath: string): unknown {
  const requirePath = require.resolve(resolvedPath)
  deleteRequireCacheTree(requirePath)
  return require(requirePath)
}
