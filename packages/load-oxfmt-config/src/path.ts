import { relative } from 'node:path'

/**
 * Check whether a relative path points outside its intended base directory.
 *
 * This also recognizes Windows drive-qualified paths when running on another
 * platform so the behavior can be tested consistently.
 *
 * @param path - Relative path candidate.
 * @returns True when the path escapes or is absolute.
 */
export function isPathOutsideBase(path: string): boolean {
  const normalizedPath = toPosixPath(path)
  return (
    normalizedPath === '..' ||
    normalizedPath.startsWith('../') ||
    normalizedPath.startsWith('/') ||
    /^[A-Za-z]:\//u.test(normalizedPath)
  )
}

/**
 * Split a path into non-empty segments.
 *
 * @param path - Original path.
 * @returns Path segments.
 */
export function splitPathSegments(path: string): string[] {
  return path.split(/[\\/]+/u).filter(Boolean)
}

/**
 * Normalize a filesystem path to POSIX-style separators.
 *
 * @param path - Original path.
 * @returns Path using `/` as separator.
 */
export function toPosixPath(path: string): string {
  return path.replaceAll('\\', '/')
}

/**
 * Convert a target path to a POSIX path relative to its owning directory.
 */
export function toRelativePosixPath(from: string, to: string): string {
  return toPosixPath(relative(from, to))
}
