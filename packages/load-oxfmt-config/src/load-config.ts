import { dirname, resolve } from 'node:path'
import process from 'node:process'
import { isObject } from '@ntnyq/utils'
import { cachePromise, getConfigCacheKey, getResolveCacheKey } from './cache'
import {
  getEditorconfigResolveCacheKey,
  getEditorconfigSearchDir,
  mergeOverrides,
  mergeRootOptions,
  readEditorconfigFromFile,
  resolveEditorconfigPath,
} from './editorconfig'
import { readConfigFromFile } from './read-config'
import { resolveOxfmtrcPath } from './resolve-config'
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
 * Share raw config reads across files without caching file-specific fallbacks.
 */
const sourceCache = new Map<string, Promise<OxfmtOptions>>()

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
  return loadConfig(options)
}

/**
 * Load config with EditorConfig fallbacks resolved for one file.
 * Explicit oxfmt overrides remain unevaluated and retain their config-relative globs.
 *
 * @param options - Loader settings with the target file path.
 * @returns Config with per-file EditorConfig defaults and config metadata.
 */
export async function loadOxfmtConfigForFile(
  options: LoadOxfmtConfigOptions & { filepath: string },
): Promise<LoadOxfmtConfigResult> {
  return loadConfig(options, 'per-file')
}

/**
 * Share discovery and caches between static and per-file loading.
 *
 * @param options - Loader settings.
 * @param editorconfigMode - Return static overrides or resolve defaults for the target file.
 * @returns Loaded config and metadata.
 */
async function loadConfig(
  options: LoadOxfmtConfigOptions,
  editorconfigMode: 'per-file' | 'static' = 'static',
): Promise<LoadOxfmtConfigResult> {
  const useCache = options.useCache !== false
  const useCliConfig = options.useCliConfig === true
  const cwd = resolve(options.cwd || process.cwd())
  const filepath = options.filepath ? resolve(cwd, options.filepath) : undefined

  const isNestedConfigDisabled = Boolean(
    options.configPath || options.disableNestedConfig,
  )
  const configLookupCwd =
    isNestedConfigDisabled || !filepath ? cwd : dirname(filepath)
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

  const resolveKey = JSON.stringify([
    getResolveCacheKey(configLookupCwd, options.configPath),
    useCliConfig,
  ])
  const editorconfigSearchDir =
    editorconfigCwd ??
    (useCliConfig
      ? cwd
      : getEditorconfigSearchDir(configLookupCwd, options.configPath))
  const editorconfigResolveKey = getEditorconfigResolveCacheKey(
    JSON.stringify([editorconfigSearchDir, onlyCwd]),
  )

  const resolveConfig = () =>
    resolveOxfmtrcPath(configLookupCwd, options.configPath, {
      errorOnConflict: useCliConfig,
    })
  const resolvedPath = options.loadedConfig
    ? options.loadedConfig.filepath
    : useCache
      ? await cachePromise(resolveCache, resolveKey, resolveConfig)
      : await resolveConfig()

  const editorconfigPath = useEditorconfig
    ? await (useCache
        ? cachePromise(resolveCache, editorconfigResolveKey, () =>
            resolveEditorconfigPath(editorconfigSearchDir, onlyCwd),
          )
        : resolveEditorconfigPath(editorconfigSearchDir, onlyCwd))
    : undefined

  const anchorDir = dirname(resolvedPath || editorconfigPath || cwd)
  const configKey = getConfigCacheKey(
    resolvedPath,
    editorconfigPath,
    JSON.stringify([
      resolveKey,
      editorconfigMode === 'per-file' ? filepath : null,
    ]),
  )

  const loadTask = async () => {
    const source = await loadConfigSource(
      resolvedPath,
      options.loadedConfig,
      useCache,
      useCliConfig,
    )
    const oxfmtConfig = source.options

    if (!editorconfigPath) {
      return oxfmtConfig
    }

    const editorconfigData = await readEditorconfigFromFile(
      editorconfigPath,
      anchorDir,
      {
        filepath: editorconfigMode === 'per-file' ? filepath : undefined,
        useCache,
      },
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

  const config =
    useCache && !options.loadedConfig
      ? await cachePromise(configCache, configKey, loadTask)
      : await loadTask()

  return {
    config,
    ...(resolvedPath
      ? {
          dirname: dirname(resolvedPath),
          filepath: resolvedPath,
        }
      : {}),
  }
}

/**
 * Keep raw source options separate from the EditorConfig merge stage.
 * Preloaded public results retain their existing pass-through semantics.
 */
async function loadConfigSource(
  resolvedPath: string | undefined,
  loadedConfig: LoadOxfmtConfigResult | undefined,
  useCache: boolean,
  useCliConfig: boolean,
): Promise<{ options: OxfmtOptions }> {
  if (loadedConfig) {
    return {
      options: loadedConfig.config,
    }
  }

  const readSource = async (): Promise<OxfmtOptions> =>
    resolvedPath
      ? readConfigFromFile(resolvedPath, { useCache, useCliConfig }).catch(
          error => {
            throw new Error(
              `Failed to parse oxfmt configuration file at ${resolvedPath}: ${error instanceof Error ? error.message : String(error)}`,
              { cause: error },
            )
          },
        )
      : {}
  const options =
    useCache && resolvedPath
      ? await cachePromise(
          sourceCache,
          JSON.stringify([resolvedPath, useCliConfig]),
          readSource,
        )
      : await readSource()

  return {
    options,
  }
}
