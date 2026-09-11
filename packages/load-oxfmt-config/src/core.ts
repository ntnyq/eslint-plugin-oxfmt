import { dirname, resolve } from 'node:path'
import process from 'node:process'
import { isObject } from '@ntnyq/utils'
import {
  getConfigCacheKey,
  getResolveCacheKey,
  readConfigFromFile,
  resolveOxfmtrcPath,
} from './config'
import {
  getEditorconfigResolveCacheKey,
  getEditorconfigSearchDir,
  mergeOverrides,
  mergeRootOptions,
  readEditorconfigFromFile,
  resolveEditorconfigPath,
} from './editorconfig'
import { cachePromise } from './utils'
import type {
  LoadOxfmtConfigOptions,
  LoadOxfmtConfigResult,
  OxfmtOptions,
} from './types'

/**
 * Cache resolved config paths keyed by the effective lookup directory and optional config path.
 */
const resolveCache = new Map<string, Promise<string | undefined>>()

/**
 * Cache parsed and merged config objects keyed by resolved config and EditorConfig paths.
 */
const configCache = new Map<string, Promise<OxfmtOptions>>()

/**
 * Resolve config + editorconfig and return merged config with metadata.
 *
 * @param options - Loader settings.
 * @returns Merged config and optional resolved config metadata.
 *
 * @example
 * ```ts
 * import { loadOxfmtConfig } from 'load-oxfmt-config'
 *
 * const result = await loadOxfmtConfig({ cwd: process.cwd() })
 * console.log(result.config)
 * ```
 */
export async function loadOxfmtConfig(
  options: LoadOxfmtConfigOptions = {},
): Promise<LoadOxfmtConfigResult> {
  const useCache = options.useCache !== false
  const cwd = resolve(options.cwd || process.cwd())
  const filepath = options.filepath ? resolve(cwd, options.filepath) : undefined

  const nestedConfigDisabled = options.configPath || options.disableNestedConfig
  const configLookupCwd =
    nestedConfigDisabled || !filepath ? cwd : dirname(filepath)
  const editorconfig = options.editorconfig ?? true
  const useEditorconfig = editorconfig !== false
  const isEditorconfigOptionsObject = useEditorconfig && isObject(editorconfig)

  const onlyCwd = isEditorconfigOptionsObject
    ? (editorconfig.onlyCwd ?? false)
    : false

  const editorconfigCwd =
    isEditorconfigOptionsObject && editorconfig.cwd
      ? resolve(editorconfig.cwd)
      : undefined

  const resolveKey = getResolveCacheKey(configLookupCwd, options.configPath)
  const editorconfigSearchDir =
    editorconfigCwd ||
    getEditorconfigSearchDir(configLookupCwd, options.configPath)
  const editorconfigResolveKey = editorconfigCwd
    ? getEditorconfigResolveCacheKey(
        `${editorconfigCwd}::${options.configPath || ''}::onlyCwd=${String(onlyCwd)}`,
      )
    : getEditorconfigResolveCacheKey(
        `${resolveKey}::onlyCwd=${String(onlyCwd)}`,
      )

  const resolvedPath = useCache
    ? await cachePromise(resolveCache, resolveKey, () =>
        resolveOxfmtrcPath(configLookupCwd, options.configPath),
      )
    : await resolveOxfmtrcPath(configLookupCwd, options.configPath)

  const editorconfigPath = useEditorconfig
    ? await (useCache
        ? cachePromise(resolveCache, editorconfigResolveKey, () =>
            resolveEditorconfigPath(editorconfigSearchDir, onlyCwd),
          )
        : resolveEditorconfigPath(editorconfigSearchDir, onlyCwd))
    : undefined

  const anchorDir = dirname(resolvedPath || editorconfigPath || cwd)

  const loadTask = async () => {
    const oxfmtConfig = resolvedPath
      ? await readConfigFromFile(resolvedPath, { useCache }).catch(error => {
          throw new Error(
            `Failed to parse oxfmt configuration file at ${resolvedPath}: ${error instanceof Error ? error.message : String(error)}`,
            {
              cause: error,
            },
          )
        })
      : {}

    if (!editorconfigPath) {
      return oxfmtConfig
    }

    const editorconfigData = await readEditorconfigFromFile(
      editorconfigPath,
      anchorDir,
    )

    const mergedConfig = mergeRootOptions(
      oxfmtConfig,
      editorconfigData.rootOptions,
    )
    const mergedOverrides = mergeOverrides(
      oxfmtConfig,
      editorconfigData.overrides,
    )

    if (!mergedOverrides) {
      return mergedConfig
    }

    return {
      ...mergedConfig,
      overrides: mergedOverrides,
    }
  }

  const hasNoConfigSources = !resolvedPath && !editorconfigPath
  const config: OxfmtOptions = await (async () => {
    if (hasNoConfigSources) {
      return useCache
        ? await cachePromise(
            configCache,
            getConfigCacheKey(resolvedPath, editorconfigPath, resolveKey),
            () => Promise.resolve({}),
          )
        : {}
    }

    return useCache
      ? await cachePromise(
          configCache,
          getConfigCacheKey(resolvedPath, editorconfigPath, resolveKey),
          loadTask,
        )
      : await loadTask()
  })()

  return {
    config,
    ...(resolvedPath
      ? { dirname: dirname(resolvedPath), filepath: resolvedPath }
      : {}),
  }
}
