import { stat } from 'node:fs/promises'
import { isAbsolute, join, resolve } from 'node:path'
import { OXFMT_CONFIG_FILES } from './constants'

/**
 * Resolve the oxfmt config file path.
 *
 * - If `configPath` is provided, absolute paths are returned as-is;
 *   relative paths are joined to `cwd`.
 * - Otherwise, walk upward from `cwd` to find known filenames.
 *
 * @param cwd - Starting directory for resolution.
 * @param configPath - Optional explicit path.
 * @param options - Discovery settings.
 * @param options.errorOnConflict - Reject multiple configs in the same directory.
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
  options: {
    errorOnConflict?: boolean
  } = {},
): Promise<string | undefined> {
  const resolvedCwd = resolve(cwd)

  if (configPath) {
    return isAbsolute(configPath) ? configPath : join(resolvedCwd, configPath)
  }

  let currentDir = resolvedCwd

  while (true) {
    let foundFilename: string | undefined

    for (const filename of OXFMT_CONFIG_FILES) {
      const configFilePath = join(currentDir, filename)

      try {
        const stats = await stat(configFilePath)

        if (!stats.isFile()) {
          continue
        }
      } catch (error) {
        const code = (error as NodeJS.ErrnoException).code

        if (code !== 'ENOENT' && code !== 'ENOTDIR') {
          throw error
        }

        continue
      }

      if (!options.errorOnConflict) {
        return configFilePath
      }

      if (foundFilename) {
        throw new Error(
          `Conflicting oxfmt config files "${foundFilename}" and "${filename}" in ${currentDir}.`,
        )
      }

      foundFilename = filename
    }

    if (foundFilename) {
      return join(currentDir, foundFilename)
    }

    const parentDir = join(currentDir, '..')

    if (parentDir === currentDir) {
      break
    }

    currentDir = parentDir
  }

  return undefined
}
