import { readFile, stat } from 'node:fs/promises'
import { dirname, isAbsolute, join, resolve } from 'node:path'
import { cachePromise } from './cache'

/**
 * Git discovery is shared by files in the same directory and bounded like config caches.
 * Bypassing caches also bypasses cached missing Git entries and worktree pointers.
 */
const repoRootCache = new Map<string, Promise<string | undefined>>()
const gitignorePathsCache = new Map<string, Promise<GitignorePaths>>()
const infoExcludePathCache = new Map<string, Promise<string | undefined>>()

interface GitignorePaths {
  paths: string[]
  repoRoot: string | undefined
}

/**
 * Collect source-relative ignore files without repeating Git discovery for sibling files.
 */
export function collectGitignorePaths(
  filepath: string,
  useCache: boolean,
): Promise<GitignorePaths> {
  const fileDir = dirname(filepath)
  const discover = () => readGitignorePaths(fileDir, useCache)

  return useCache
    ? cachePromise(gitignorePathsCache, fileDir, discover)
    : discover()
}

/**
 * Resolve a repository's info exclude file, including worktree common directories.
 */
export function resolveGitInfoExcludePath(
  repoRoot: string,
  useCache: boolean,
): Promise<string | undefined> {
  const discover = () => readGitInfoExcludePath(repoRoot)

  return useCache
    ? cachePromise(infoExcludePathCache, repoRoot, discover)
    : discover()
}

/**
 * Find the nearest git repo root by walking up from a start directory.
 *
 * @param fromDir - Directory to start from.
 * @returns Repo root directory, or undefined when no git boundary is found.
 */
function findGitRepoRoot(
  fromDir: string,
  useCache: boolean,
): Promise<string | undefined> {
  const discover = async (): Promise<string | undefined> => {
    if (await hasGitEntry(fromDir)) {
      return fromDir
    }

    const parentDir = dirname(fromDir)

    return parentDir === fromDir
      ? undefined
      : findGitRepoRoot(parentDir, useCache)
  }

  return useCache ? cachePromise(repoRootCache, fromDir, discover) : discover()
}

/**
 * Check whether a directory looks like a git repo root.
 *
 * A `.git` entry can be either a directory (regular repo) or a file (worktree/submodule).
 *
 * @param dir - Directory to inspect.
 * @returns True when `.git` exists under the directory.
 */
async function hasGitEntry(dir: string) {
  try {
    await stat(join(dir, '.git'))

    return true
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code

    if (code === 'ENOENT' || code === 'ENOTDIR') {
      return false
    }

    throw error
  }
}

/**
 * Collect `.gitignore` files from file directory up to git repo boundary.
 *
 * @param fileDir - Absolute target directory.
 * @param useCache - Whether Git discovery can be reused.
 * @returns Collected ignore files and repo root when found.
 */
async function readGitignorePaths(fileDir: string, useCache: boolean) {
  const repoRoot = await findGitRepoRoot(fileDir, useCache)
  const paths: string[] = []
  let current = fileDir

  while (true) {
    paths.push(join(current, '.gitignore'))

    if (repoRoot && current === repoRoot) {
      break
    }

    const parent = dirname(current)

    if (parent === current) {
      break
    }

    current = parent
  }

  return {
    paths,
    repoRoot,
  }
}

/**
 * Resolve the git info exclude file from a repo root.
 *
 * Worktrees and submodules store `.git` as a file containing a `gitdir:` pointer.
 *
 * @param repoRoot - Git repository working tree root.
 * @returns Absolute path to the git info exclude file, or undefined when unavailable.
 */
async function readGitInfoExcludePath(repoRoot: string) {
  const gitEntryPath = join(repoRoot, '.git')

  try {
    const stats = await stat(gitEntryPath)

    if (stats.isDirectory()) {
      return join(gitEntryPath, 'info', 'exclude')
    }

    if (!stats.isFile()) {
      return undefined
    }

    const gitEntryContent = await readFile(gitEntryPath, 'utf8')
    const gitdirLine = gitEntryContent
      .split(/\r?\n/u)
      .find(line => line.startsWith('gitdir:'))
    const gitdir = gitdirLine?.slice('gitdir:'.length).trim()

    if (!gitdir) {
      return undefined
    }

    const resolvedGitDir = isAbsolute(gitdir)
      ? gitdir
      : resolve(repoRoot, gitdir)
    const commonDirPath = join(resolvedGitDir, 'commondir')

    try {
      const commonDirContent = await readFile(commonDirPath, 'utf8')
      const commonDir = commonDirContent.trim()

      if (commonDir) {
        const resolvedCommonDir = isAbsolute(commonDir)
          ? commonDir
          : resolve(resolvedGitDir, commonDir)

        return join(resolvedCommonDir, 'info', 'exclude')
      }
    } catch (error) {
      const code = (error as NodeJS.ErrnoException).code

      if (code !== 'ENOENT' && code !== 'ENOTDIR') {
        throw error
      }
    }

    return join(resolvedGitDir, 'info', 'exclude')
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code

    if (code === 'ENOENT' || code === 'ENOTDIR') {
      return undefined
    }

    throw error
  }
}
