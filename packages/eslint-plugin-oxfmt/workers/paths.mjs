// @ts-check

import { relative } from 'node:path'

/**
 * Check relative paths before passing them to gitignore-style matchers.
 * Drive-qualified and UNC paths may appear after Windows cross-volume resolution.
 * @param {string} path - Relative path candidate.
 * @returns {boolean} Whether the path is absolute or outside the matching base.
 */
export function isPathOutsideBase(path) {
  const normalizedPath = path.replaceAll('\\', '/')

  return (
    normalizedPath === '..' ||
    normalizedPath.startsWith('../') ||
    normalizedPath.startsWith('/') ||
    /^[A-Za-z]:\//u.test(normalizedPath)
  )
}

/**
 * Normalize a file path relative to the provided base directory.
 * @param {string} baseDir - Base directory used for glob evaluation.
 * @param {string} filename - Absolute file path.
 * @returns {string} Relative path using forward slashes.
 */
export function toRelativePosixPath(baseDir, filename) {
  return relative(baseDir, filename).replace(/\\/g, '/')
}
