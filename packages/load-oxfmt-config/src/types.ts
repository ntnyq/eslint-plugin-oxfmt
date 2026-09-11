import type { FormatConfig } from 'oxfmt'

/**
 * Object-form `.editorconfig` option for fine-grained lookup control.
 */
export interface EditorconfigOption {
  /**
   * Override the directory from which `.editorconfig` resolution starts.
   *
   * When set, `.editorconfig` is searched from this directory instead of from
   * the config lookup directory. This is useful when the oxfmt config path is
   * pre-resolved and EditorConfig should still be resolved from another
   * directory, such as each file's directory.
   */
  cwd?: string
  /**
   * When `true`, only look for `.editorconfig` in the `cwd` directory itself
   * (no upward traversal).
   *
   * @default false
   */
  onlyCwd?: boolean
}

/**
 * Options for resolving whether a single file should be ignored.
 */
export interface IsOxfmtIgnoredOptions {
  /**
   * File path to test.
   */
  filepath: string
  /**
   * Explicit oxfmt config path.
   *
   * When provided, nested config lookup is disabled (same as oxfmt CLI -c).
   */
  configPath?: string
  /**
   * Current working directory.
   *
   * Also the base directory for default `.prettierignore` lookup.
   */
  cwd?: string
  /**
   * Disable nested config lookup.
   *
   * @default false
   */
  disableNestedConfig?: boolean
  /**
   * Ignore files to use instead of the default cwd `.prettierignore`.
   *
   * Explicit ignore paths do not replace `.gitignore` or `.git/info/exclude`
   * handling. They can be passed multiple times in CLI style.
   */
  ignorePath?: string | string[]
  /**
   * Whether to include ignore patterns defined in the config file.
   *
   * @default true
   */
  includeConfigIgnorePatterns?: boolean
  /**
   * Whether to load resolved oxfmt config when evaluating config ignore patterns.
   *
   * When false, only global ignore is applied and config loading is skipped.
   *
   * @default true
   */
  loadConfigForIgnorePatterns?: boolean
  /**
   * Whether to use in-memory cache.
   *
   * @default true
   */
  useCache?: boolean
  /**
   * Whether node_modules should be included.
   *
   * @default false
   */
  withNodeModules?: boolean
}

/**
 * Ignore resolution result.
 */
export interface IsOxfmtIgnoredResult {
  /**
   * Whether the file should be ignored.
   */
  ignored: boolean
  /**
   * Matched ignore source when `ignored` is true.
   */
  reason?:
    | 'config-ignore-patterns'
    | 'default-dir'
    | 'git-info-exclude'
    | 'gitignore'
    | 'ignore-path'
    | 'lockfile'
    | 'prettierignore'
}

/**
 * Options for loading and merging oxfmt configuration.
 */
export interface LoadOxfmtConfigOptions {
  /**
   * Path to the configuration file.
   */
  configPath?: string
  /**
   * Current working directory.
   */
  cwd?: string
  /**
   * Disable nested config lookup.
   * When true, config discovery is anchored to `cwd` (or explicit `configPath`).
   *
   * @default false
   */
  disableNestedConfig?: boolean
  /**
   * Control `.editorconfig` reading.
   * - `true` (default): read and merge `.editorconfig`, walking up from the config
   *   file's directory (or `cwd` when no config path is given).
   * - `false`: disable `.editorconfig` reading entirely.
   * - `EditorconfigOption`: enable with additional settings (e.g. `onlyCwd`).
   *
   * @default true
   */
  editorconfig?: boolean | EditorconfigOption
  /**
   * File path being formatted. When provided (and `configPath` is not set),
   * config discovery starts from this file's directory to match oxfmt nested
   * config behavior.
   */
  filepath?: string
  /**
   * Whether to use in-memory caches for path resolution and parsed config contents.
   *
   * @default true
   */
  useCache?: boolean
}

/**
 * Result object with metadata about resolved oxfmt config.
 */
export interface LoadOxfmtConfigResult {
  /**
   * Final merged config from oxfmt and optional `.editorconfig` mapping.
   */
  config: OxfmtOptions
  /**
   * Directory of resolved config file.
   */
  dirname?: string
  /**
   * Absolute path of resolved config file.
   */
  filepath?: string
}

/**
 * Format option override for a single matching rule.
 */
export interface OxfmtConfigOverride {
  /**
   * Glob patterns to match files.
   */
  files: string[]
  /**
   * Glob patterns to exclude files.
   */
  excludeFiles?: string[]
  /**
   * Format options to apply.
   */
  options?: FormatConfig
}

/**
 * Final oxfmt options, including config `ignorePatterns` and `overrides`.
 */
export interface OxfmtOptions extends FormatConfig {
  /**
   * Ignore files matching these glob patterns.
   *
   * Patterns use gitignore-style matching rooted at the oxfmt configuration
   * directory. Parent-directory (`..`) path segments are rejected.
   */
  ignorePatterns?: string[]
  /**
   * Array of format option overrides.
   */
  overrides?: OxfmtConfigOverride[]
}
