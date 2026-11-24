import { createHash } from 'node:crypto'
import { readFile, realpath } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { extname } from 'node:path'
import { pathToFileURL } from 'node:url'
import { isModuleNamespaceObject } from 'node:util/types'
import { hasOwn, interopDefault, isObject, isString } from '@ntnyq/utils'
import { getCacheValue, setCacheValue } from './cache'
import { splitPathSegments } from './path'
import type { OxfmtOptions } from './types'

/**
 * CommonJS require scoped to this ESM module for loading JavaScript configs.
 */
const require = createRequire(import.meta.url)

/**
 * Node error codes that mean CommonJS require should fall back to ESM loading.
 */
const REQUIRE_FALLBACK_ERROR_CODES = new Set([
  'ERR_REQUIRE_ASYNC_MODULE',
  'ERR_REQUIRE_ESM',
])

/**
 * Syntax errors that indicate module syntax was parsed through CommonJS.
 */
const MODULE_SYNTAX_ERROR_PATTERNS = [
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
 * Check whether an unknown config export is an object accepted by oxfmt.
 *
 * @param value - Runtime value to validate.
 * @returns True when the value can be treated as an oxfmt options object.
 */
export function isConfigObject(value: unknown): value is OxfmtOptions {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return false
  }

  const prototype = Object.getPrototypeOf(value)

  return prototype === Object.prototype || prototype === null
}

/**
 * Load a JS/TS configuration using the module format's cache semantics.
 */
export async function loadConfigModule(
  resolvedPath: string,
  useCache: boolean,
  validateConfig: (config: OxfmtOptions) => void,
): Promise<OxfmtOptions> {
  const extension = extname(resolvedPath)

  if (useCache && (extension === '.cjs' || extension === '.js')) {
    return loadCachedJavaScriptConfig(resolvedPath, validateConfig)
  }

  let config: OxfmtOptions

  if (extension === '.cjs') {
    const configModule = requireFreshModule(resolvedPath)

    config = isModuleNamespaceObject(configModule)
      ? readConfigDefaultExport(configModule as Record<string, unknown>)
      : readConfigModuleExports(configModule)
  } else if (!useCache && extension === '.mjs') {
    config = readConfigDefaultExport(
      await importNativeFreshModule(resolvedPath),
    )
  } else if (extension === '.js') {
    config = readConfigDefaultExport(
      await importFreshJavaScriptConfigModule(resolvedPath),
    )
  } else {
    config = readConfigDefaultExport(
      await importJitiConfigModule(resolvedPath, useCache),
    )
  }

  validateConfig(config)

  return config
}

/**
 * Delete a CommonJS module and its local dependencies from the cache.
 *
 * @param requirePath - Resolved CommonJS module id.
 * @param preservedModules - Dependencies already cached before this load.
 * @param seen - Visited module ids used to avoid cycles.
 */
function deleteRequireCacheTree(
  requirePath: string,
  preservedModules?: ReadonlySet<string>,
  seen = new Set<string>(),
) {
  if (seen.has(requirePath)) {
    return
  }

  seen.add(requirePath)

  const cachedModule = require.cache[requirePath]

  if (cachedModule) {
    for (const child of cachedModule.children) {
      if (
        !preservedModules?.has(child.id) &&
        !splitPathSegments(child.id).includes('node_modules')
      ) {
        deleteRequireCacheTree(child.id, preservedModules, seen)
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

  if (
    cachedModule ||
    loaderPaths.some(path =>
      isModuleNamespaceObject(require.cache[path]?.exports),
    )
  ) {
    // A cached require can have already evaluated the unversioned ESM URL.
    const namespace = await importNativeFreshModule(resolvedPath, cacheKey)

    setCacheValue(freshJavaScriptModuleCache, resolvedPath, {
      cacheKey,
      namespace,
    })

    return namespace
  }

  try {
    const configModule = requireFreshModule(resolvedPath)

    if (isModuleNamespaceObject(configModule)) {
      const namespace = configModule as Record<string, unknown>

      setCacheValue(freshJavaScriptModuleCache, resolvedPath, {
        cacheKey,
        namespace,
      })

      return namespace
    }

    return {
      default: readConfigModuleExports(configModule),
    }
  } catch (error) {
    if (!isJavaScriptLoaderFallbackError(error, loaderPaths)) {
      throw error
    }

    try {
      const namespace = await importNativeFreshModule(resolvedPath, cacheKey)

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
 * @param cacheKey - Hash of the config contents, if already computed.
 * @returns Imported module namespace.
 */
async function importNativeFreshModule(
  resolvedPath: string,
  cacheKey?: string,
): Promise<Record<string, unknown>> {
  const url = pathToFileURL(resolvedPath)

  url.searchParams.set(
    'oxfmtConfigCacheBust',
    cacheKey ?? (await getFreshImportCacheKey(resolvedPath)),
  )

  return import(url.href) as Promise<Record<string, unknown>>
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

  if (code && REQUIRE_FALLBACK_ERROR_CODES.has(code)) {
    return true
  }

  return (
    error instanceof SyntaxError &&
    resolvedPaths.some(
      resolvedPath => error.stack?.startsWith(`${resolvedPath}:`) === true,
    ) &&
    MODULE_SYNTAX_ERROR_PATTERNS.some(pattern => pattern.test(error.message))
  )
}

/**
 * Reuse Node's module cache, rolling back newly loaded CommonJS dependencies
 * when config validation fails.
 */
async function loadCachedJavaScriptConfig(
  resolvedPath: string,
  validateConfig: (config: OxfmtOptions) => void,
) {
  const requirePath = require.resolve(resolvedPath)
  const isCjs = extname(resolvedPath) === '.cjs'
  const previouslyCached = new Set(Object.keys(require.cache))
  let configModule: unknown

  try {
    configModule = require(requirePath)
  } catch (error) {
    if (
      isCjs ||
      !isJavaScriptLoaderFallbackError(error, [resolvedPath, requirePath])
    ) {
      throw error
    }

    const config = readConfigDefaultExport(
      await importJitiConfigModule(resolvedPath, true),
    )

    validateConfig(config)

    return config
  }

  const isEsm = !isCjs && isModuleNamespaceObject(configModule)

  try {
    const config = isEsm
      ? readConfigDefaultExport(configModule as Record<string, unknown>)
      : readConfigModuleExports(configModule)

    validateConfig(config)

    return config
  } catch (error) {
    if (!isEsm && require.cache[requirePath]?.exports === configModule) {
      deleteRequireCacheTree(requirePath, previouslyCached)
    }

    throw error
  }
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
