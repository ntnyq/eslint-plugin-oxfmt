import { resolve } from 'node:path'

/**
 * Resolve a path from the plugin package directory.
 */
export function resolvePackagePath(...segments: string[]): string {
  return resolve(import.meta.dirname, '../..', ...segments)
}
