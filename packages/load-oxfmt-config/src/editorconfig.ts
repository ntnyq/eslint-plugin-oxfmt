import { readFile, stat } from 'node:fs/promises'
import { dirname, isAbsolute, join, relative } from 'node:path'
import { parseBuffer } from 'editorconfig'
import { Minimatch } from 'minimatch'
import { cachePromise, getCacheValue, setCacheValue } from './cache'
import {
  EDITORCONFIG_FILE,
  EDITORCONFIG_GLOBAL_SECTION_NAMES,
} from './constants'
import { mapEditorconfigSectionToOptions } from './editorconfig-options'
import { isPathOutsideBase, toPosixPath } from './path'
import type { ParseStringResult, SectionBody, SectionName } from 'editorconfig'
import type { EditorconfigFormatOptions } from './editorconfig-options'
import type { OxfmtConfigOverride, OxfmtOptions } from './types'

export type { EditorconfigFormatOptions } from './editorconfig-options'

/**
 * Shared input caches for static and per-file EditorConfig resolution.
 */
const sectionCache = new Map<string, Promise<ParseStringResult>>()
const matcherCache = new Map<string, Minimatch>()

/**
 * Parsed EditorConfig data split into root options and generated override entries.
 */
export interface EditorconfigData {
  /**
   * Override entries generated from non-global `.editorconfig` sections.
   */
  overrides: OxfmtConfigOverride[]
  /**
   * Root options generated from global `.editorconfig` sections.
   */
  rootOptions: EditorconfigFormatOptions
}

/**
 * @deprecated Use EditorconfigFormatOptions.
 */
export type EditorconfigOptions = EditorconfigFormatOptions

/**
 * Builds the cache key used for resolved EditorConfig lookups.
 *
 * @param resolveKey - The base resolution key for the current lookup.
 * @returns The namespaced cache key for EditorConfig resolution.
 */
export function getEditorconfigResolveCacheKey(resolveKey: string) {
  return `editorconfig::${resolveKey}`
}

/**
 * Determines the directory that should be used to search for a nearby .editorconfig file.
 *
 * @param cwd - The current working directory for the lookup.
 * @param configPath - An optional config path used to anchor the search.
 * @returns The directory where EditorConfig discovery should begin.
 */
export function getEditorconfigSearchDir(cwd: string, configPath?: string) {
  if (!configPath) {
    return cwd
  }

  const resolvedConfigPath = isAbsolute(configPath)
    ? configPath
    : join(cwd, configPath)
  return dirname(resolvedConfigPath)
}

/**
 * Merges EditorConfig-derived overrides with explicit oxfmt overrides.
 *
 * @param oxfmtConfig - Explicit root options and overrides from the oxfmt config.
 * @param editorconfigOverrides - Overrides derived from .editorconfig sections.
 * @returns The merged overrides array, or undefined when no overrides exist.
 */
export function mergeOverrides(
  oxfmtConfig: OxfmtOptions,
  editorconfigOverrides: OxfmtConfigOverride[],
) {
  const editorconfigFallbackOverrides = editorconfigOverrides.flatMap(
    override => {
      const options = Object.fromEntries(
        Object.entries(override.options || {}).filter(
          ([name]) => !Object.hasOwn(oxfmtConfig, name),
        ),
      )

      return Object.keys(options).length > 0 ? [{ ...override, options }] : []
    },
  )
  const mergedOverrides = [
    ...editorconfigFallbackOverrides,
    ...(oxfmtConfig.overrides || []),
  ]
  return mergedOverrides.length > 0 ? mergedOverrides : undefined
}

/**
 * Merges root-level EditorConfig options with oxfmt config options.
 *
 * @param oxfmtConfig - The explicit oxfmt options.
 * @param editorconfigRootOptions - Root options derived from .editorconfig.
 * @returns A single root options object where oxfmt takes precedence.
 */
export function mergeRootOptions(
  oxfmtConfig: OxfmtOptions,
  editorconfigRootOptions: EditorconfigFormatOptions,
) {
  return {
    ...editorconfigRootOptions,
    ...oxfmtConfig,
  }
}

/**
 * Reads a .editorconfig file and converts it into root options and override entries.
 *
 * @param editorconfigPath - The absolute path to the .editorconfig file.
 * @param anchorDir - The directory used to rebase section patterns.
 * @param options - Optional per-file resolution and cache controls.
 * @param options.filepath - Resolve matching sections for this absolute file path.
 * @param options.useCache - Reuse parsed sections and compiled matchers.
 * @returns Parsed EditorConfig data ready to merge into oxfmt config.
 */
export async function readEditorconfigFromFile(
  editorconfigPath: string,
  anchorDir: string,
  options: { filepath?: string; useCache?: boolean } = {},
): Promise<EditorconfigData> {
  const useCache = options.useCache !== false
  const readSections = async () => parseBuffer(await readFile(editorconfigPath))
  const parsedSections = useCache
    ? await cachePromise(sectionCache, editorconfigPath, readSections)
    : await readSections()
  const editorconfigDir = dirname(editorconfigPath)
  if (options.filepath) {
    return {
      overrides: [],
      rootOptions: resolveEditorconfigOptionsForFile(
        parsedSections,
        editorconfigDir,
        options.filepath,
        useCache,
      ),
    }
  }
  return createEditorconfigOverrides(parsedSections, editorconfigDir, anchorDir)
}

/**
 * Resolves the nearest .editorconfig file starting from a directory and optionally walking upward.
 *
 * @param startDir - The directory where the search starts.
 * @param onlyCwd - When true, only checks the starting directory.
 * @returns The resolved .editorconfig path, or undefined when none is found.
 */
export async function resolveEditorconfigPath(
  startDir: string,
  onlyCwd = false,
) {
  let currentDir = startDir

  while (true) {
    const editorconfigPath = join(currentDir, EDITORCONFIG_FILE)

    try {
      const stats = await stat(editorconfigPath)
      if (stats.isFile()) {
        return editorconfigPath
      }
    } catch (error) {
      const code = (error as NodeJS.ErrnoException).code
      if (code !== 'ENOENT' && code !== 'ENOTDIR') {
        throw error
      }

      // File does not exist, continue searching.
    }

    if (onlyCwd) {
      break
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
 * Build static defaults and source-ordered overrides relative to the oxfmt config.
 */
function createEditorconfigOverrides(
  parsedSections: ParseStringResult,
  editorconfigDir: string,
  anchorDir: string,
): EditorconfigData {
  let rootOptions: EditorconfigFormatOptions = {}
  const resolvedSection: SectionBody = {}
  const overrides: OxfmtConfigOverride[] = []

  for (const [sectionName, sectionBody] of parsedSections) {
    if (!sectionName) {
      continue
    }
    const mappedOptions = mapEditorconfigSectionToOptions(
      sectionBody,
      resolvedSection,
    )
    if (isEditorconfigGlobalSection(sectionName)) {
      Object.assign(resolvedSection, sectionBody)
      rootOptions = mapEditorconfigSectionToOptions(resolvedSection)
      // Later global sections must also override earlier scoped sections.
      if (overrides.length === 0) {
        continue
      }
    }
    if (Object.keys(mappedOptions).length === 0) {
      continue
    }
    overrides.push({
      options: mappedOptions,
      files: [
        rebaseEditorconfigPattern(sectionName, editorconfigDir, anchorDir),
      ],
    })
  }
  return {
    overrides,
    rootOptions,
  }
}

/**
 * Checks whether an EditorConfig section should be treated as a global section.
 *
 * @param sectionName - The section name parsed from .editorconfig.
 * @returns True when the section applies globally.
 */
function isEditorconfigGlobalSection(sectionName: SectionName) {
  return Boolean(
    sectionName && EDITORCONFIG_GLOBAL_SECTION_NAMES.includes(sectionName),
  )
}

/**
 * Match a section against its source-relative file path without oxfmt rebasing.
 *
 * @param pattern - Original section name.
 * @param filepath - File path relative to the EditorConfig directory.
 * @param useCache - Whether compiled matchers can be reused.
 * @returns Whether the section applies to the file.
 */
function matchesEditorconfigSection(
  pattern: string,
  filepath: string,
  useCache: boolean,
) {
  let matcher = useCache ? getCacheValue(matcherCache, pattern) : undefined
  if (!matcher) {
    matcher = new Minimatch(normalizeEditorconfigPattern(pattern), {
      dot: true,
      nocomment: true,
      noext: true,
      nonegate: true,
    })
    if (useCache) {
      setCacheValue(matcherCache, pattern, matcher)
    }
  }
  return matcher.match(filepath)
}

/**
 * Keep basename patterns recursive without changing path-scoped patterns.
 *
 * @param pattern - Original EditorConfig section name.
 * @returns Pattern suitable for matching a path relative to EditorConfig.
 */
function normalizeEditorconfigPattern(pattern: string) {
  if (pattern === '*' || pattern === '**') {
    return '**'
  }
  return pattern.includes('/') ? pattern : `**/${pattern}`
}

/**
 * Rebases an EditorConfig section pattern from the config directory to the target anchor directory.
 *
 * @param pattern - The original EditorConfig section pattern.
 * @param editorconfigDir - The directory containing the .editorconfig file.
 * @param anchorDir - The directory used as the override pattern base.
 * @returns The rebased glob pattern.
 */
function rebaseEditorconfigPattern(
  pattern: string,
  editorconfigDir: string,
  anchorDir: string,
) {
  const normalizedPattern = normalizeEditorconfigPattern(pattern)
  const relativePrefix = toPosixPath(relative(anchorDir, editorconfigDir))
  if (!relativePrefix || relativePrefix === '.') {
    return normalizedPattern
  }

  return `${relativePrefix}/${normalizedPattern.replace(/^\//u, '')}`
}

/**
 * Resolve raw section properties for a target file before mapping indentation widths.
 */
function resolveEditorconfigOptionsForFile(
  parsedSections: ParseStringResult,
  editorconfigDir: string,
  filepath: string,
  useCache: boolean,
): EditorconfigFormatOptions {
  const relativeFile = toPosixPath(relative(editorconfigDir, filepath))
  if (isPathOutsideBase(relativeFile)) {
    return {}
  }
  const resolvedSection: SectionBody = {}
  for (const [sectionName, sectionBody] of parsedSections) {
    if (
      sectionName &&
      matchesEditorconfigSection(sectionName, relativeFile, useCache)
    ) {
      Object.assign(resolvedSection, sectionBody)
    }
  }
  return mapEditorconfigSectionToOptions(resolvedSection)
}
