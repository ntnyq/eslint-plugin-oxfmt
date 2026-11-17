// @ts-check

import { getCachedOxfmtGlobMatcher } from './matchers.mjs'
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

    const fileMatcher = getCachedOxfmtGlobMatcher(override.files)
    const matches = !!fileMatcher && fileMatcher(relativePath)

    const excludeMatcher = override.excludeFiles?.length
      ? getCachedOxfmtGlobMatcher(override.excludeFiles)
      : undefined
    const excluded = excludeMatcher ? excludeMatcher(relativePath) : false

    if (matches && !excluded && override.options) {
      merged = mergeOptionObjects(
        merged,
        resolveTailwindPaths(override.options, optionsBaseDir),
      )
    }
  }

  return merged
}

/**
 * Keep arrays out of the recursive object merge.
 * @param {unknown} value - Candidate option value.
 * @returns {value is object} Whether the value is a non-array object.
 */
function isOptionObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

/**
 * Mirror oxfmt's recursive object merge; arrays and booleans replace values.
 * Null and undefined option fields are omitted by upstream deserialization.
 * @param {object} base - Inherited options.
 * @param {object} overlay - Options supplied by a matching override.
 * @returns {Record<string, unknown>} Merged options without mutating either input.
 */
function mergeOptionObjects(base, overlay) {
  return Object.fromEntries([
    ...Object.entries(base),
    ...Object.entries(overlay)
      .filter(([, value]) => value != null)
      .map(([key, value]) => {
        /** @type {unknown} */
        const inherited = Reflect.get(base, key)

        return [
          key,
          isOptionObject(inherited) && isOptionObject(value)
            ? mergeOptionObjects(inherited, value)
            : value,
        ]
      }),
  ])
}
