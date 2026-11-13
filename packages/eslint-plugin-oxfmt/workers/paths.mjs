// @ts-check

import { relative } from 'node:path'

/**
 * Normalize a file path relative to the provided base directory.
 * @param {string} baseDir - Base directory used for glob evaluation.
 * @param {string} filename - Absolute file path.
 * @returns {string} Relative path using forward slashes.
 */
export function toRelativePosixPath(baseDir, filename) {
  return relative(baseDir, filename).replace(/\\/g, '/')
}
