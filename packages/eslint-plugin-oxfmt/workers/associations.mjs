// @ts-check

import { dirname, join } from 'node:path'
import { getCachedOverrideMatcher } from './matchers.mjs'
import { isStringArray } from './options.mjs'
import { toRelativePosixPath } from './paths.mjs'

/**
 * @typedef {import('load-oxfmt-config').OxfmtOptions} OxfmtOptions
 */

/**
 * Filename suffixes selecting the same formatter as upstream Language routes.
 * The format() API does not accept a language, unlike the CLI.
 * @type {Record<import('oxfmt').Language, string>}
 */
const LANGUAGE_SUFFIXES = {
  'angular-html': 'component.html',
  astro: 'astro',
  css: 'css',
  graphql: 'graphql',
  handlebars: 'hbs',
  html: 'html',
  javascript: 'js',
  json: 'json',
  json5: 'json5',
  jsonc: 'jsonc',
  jsx: 'jsx',
  less: 'less',
  markdown: 'md',
  mdx: 'mdx',
  scss: 'scss',
  svelte: 'svelte',
  toml: 'toml',
  tsx: 'tsx',
  typescript: 'ts',
  vue: 'vue',
  yaml: 'yaml',
}

/**
 * Upstream classify_as excludes these even when associations explicitly match.
 * Keep this guard before substituting a formatter filename.
 * @type {Set<string>}
 */
export const ASSOCIATION_EXCLUDED_FILENAMES = new Set([
  'bun.lock',
  'Cargo.lock',
  'composer.lock',
  'deno.lock',
  'flake.lock',
  'Gopkg.lock',
  'mcmod.info',
  'MODULE.bazel.lock',
  'package-lock.json',
  'Package.resolved',
  'pdm.lock',
  'Pipfile.lock',
  'pnpm-lock.yaml',
  'poetry.lock',
  'uv.lock',
  'yarn.lock',
])

/**
 * Resolve the last matching association, validating entries even if unmatched.
 * @param {string} filename - Original file path.
 * @param {OxfmtOptions['associations']} associations - Ordered associations.
 * @param {string} baseDir - Directory that owns the association patterns.
 * @returns {string} Filename used only for selecting the formatter.
 */
export function resolveAssociationFilename(filename, associations, baseDir) {
  if (associations === undefined) {
    return filename
  }
  if (!Array.isArray(associations)) {
    throw new TypeError('oxfmt associations must be an array.')
  }

  const relativePath = toRelativePosixPath(baseDir, filename)
  let formatFilename = filename
  for (const association of associations) {
    if (
      !association ||
      !isStringArray(association.files) ||
      (association.excludeFiles !== undefined &&
        !isStringArray(association.excludeFiles)) ||
      !Object.hasOwn(LANGUAGE_SUFFIXES, association.language)
    ) {
      throw new TypeError(
        'Invalid oxfmt association: expected files, optional excludeFiles, and a supported language.',
      )
    }

    const matches = getCachedOverrideMatcher(association.files)(relativePath)
    const excluded = association.excludeFiles
      ? getCachedOverrideMatcher(association.excludeFiles)(relativePath)
      : false
    if (matches && !excluded) {
      // Use a neutral basename to avoid package.json sorting and .component.html
      // detection overriding the explicitly selected language.
      formatFilename = join(
        dirname(filename),
        `__oxfmt__.${LANGUAGE_SUFFIXES[association.language]}`,
      )
    }
  }
  return formatFilename
}
