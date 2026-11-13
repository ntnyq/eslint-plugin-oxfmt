import { resolve } from 'node:path'

/**
 * Resolve a path from the plugin package directory.
 */
export function resolvePackagePath(...segments: string[]): string {
  return resolve(import.meta.dirname, '../..', ...segments)
}

/**
 * Installed CLI used as the reference in formatter parity scenarios.
 */
export const OXFMT_CLI = resolvePackagePath('node_modules/oxfmt/bin/oxfmt')
