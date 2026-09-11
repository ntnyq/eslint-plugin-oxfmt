/**
 * Supported configuration files for oxfmt.
 * @see https://oxc.rs/docs/guide/usage/formatter/config.html#oxfmtrc-json-c
 */
export const OXFMT_CONFIG_FILES = [
  '.oxfmtrc.json',
  '.oxfmtrc.jsonc',
  'oxfmt.config.ts',
  'oxfmt.config.mts',
]

/**
 * Supported extensions for explicit config paths.
 */
export const OXFMT_EXPLICIT_CONFIG_EXTENSIONS = [
  '.json',
  '.jsonc',
  '.ts',
  '.mts',
  '.cts',
  '.js',
  '.mjs',
  '.cjs',
]

/**
 * Default ignored directories used by oxfmt CLI semantics.
 */
export const DEFAULT_IGNORED_DIRS = [
  '.git',
  '.jj',
  '.sl',
  '.svn',
  '.hg',
  'node_modules',
]

/**
 * Common lockfiles ignored by default.
 *
 * Note: oxfmt docs only list package-lock.json and pnpm-lock.yaml explicitly,
 * then mention "etc.". This list mirrors common ecosystem lockfiles.
 */
export const DEFAULT_IGNORED_LOCKFILES = [
  'package-lock.json',
  'pnpm-lock.yaml',
  'yarn.lock',
  'MODULE.bazel.lock',
  'bun.lock',
  'deno.lock',
  'composer.lock',
  'Package.resolved',
  'Pipfile.lock',
  'flake.lock',
  'Cargo.lock',
  'Gopkg.lock',
  'pdm.lock',
  'poetry.lock',
  'uv.lock',
  'npm-shrinkwrap.json',
  'bun.lockb',
]

/**
 * Supported EditorConfig filename.
 */
export const EDITORCONFIG_FILE = '.editorconfig'

/**
 * Sections that apply globally and can be merged into root-level oxfmt options.
 */
export const EDITORCONFIG_GLOBAL_SECTION_NAMES = ['*']

/**
 * Maximum number of entries retained by each process-level cache.
 */
export const CACHE_MAX_ENTRIES = 1000
