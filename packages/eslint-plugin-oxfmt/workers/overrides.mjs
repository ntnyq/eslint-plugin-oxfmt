// @ts-check

import { getCachedOverrideMatcher } from './matchers.mjs'
import { resolveTailwindPaths } from './options.mjs'

/**
 * @typedef {import('load-oxfmt-config').OxfmtConfigOverride} OxfmtConfigOverride
 */

/**
 * Apply override entries to a base options object.
 * @param {string} relativePath - Relative file path used for matching.
 * @param {import('oxfmt').FormatConfig} baseOptions - Base format options.
 * @param {OxfmtConfigOverride[] | undefined} overrides - Override entries.
 * @param {string} optionsBaseDir - Base directory for paths inside override options.
 * @returns {import('oxfmt').FormatConfig} Options after override merge.
 */
export function applyOverrides(
  relativePath,
  baseOptions,
  overrides,
  optionsBaseDir,
) {
  if (!overrides?.length) {
    return baseOptions
  }

  /**
   * Format options after applying each matching override in order.
   * @type {import('oxfmt').FormatConfig}
   */
  let merged = baseOptions
  for (const override of overrides) {
    if (!override?.files?.length) {
      continue
    }

    const fileMatcher = getCachedOverrideMatcher(override.files)
    const matches = !!fileMatcher && fileMatcher(relativePath)

    const excludeMatcher = override.excludeFiles?.length
      ? getCachedOverrideMatcher(override.excludeFiles)
      : undefined
    const excluded = excludeMatcher ? excludeMatcher(relativePath) : false

    if (matches && !excluded && override.options) {
      merged = {
        ...merged,
        ...resolveTailwindPaths(override.options, optionsBaseDir),
      }
    }
  }

  return merged
}
