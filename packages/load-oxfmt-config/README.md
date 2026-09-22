# load-oxfmt-config

[![CI](https://github.com/ntnyq/eslint-plugin-oxfmt/workflows/CI/badge.svg)](https://github.com/ntnyq/eslint-plugin-oxfmt/actions)
[![NPM VERSION](https://img.shields.io/npm/v/load-oxfmt-config.svg)](https://www.npmjs.com/package/load-oxfmt-config)
[![NPM DOWNLOADS](https://img.shields.io/npm/dy/load-oxfmt-config.svg)](https://www.npmjs.com/package/load-oxfmt-config)
[![LICENSE](https://img.shields.io/github/license/ntnyq/eslint-plugin-oxfmt.svg)](https://github.com/ntnyq/eslint-plugin-oxfmt/blob/main/LICENSE)

> Load and resolve oxfmt configuration files, including explicit JS/TS config paths, and merge supported `.editorconfig` settings for [oxfmt](https://oxc.rs/docs/guide/usage/formatter.html).

Maintained in the [eslint-plugin-oxfmt monorepo](https://github.com/ntnyq/eslint-plugin-oxfmt). See the root README for development and release instructions.

## Features

- 🔍 **Auto-discovery** - Automatically searches for config files in current and parent directories
- 📦 **Multiple formats** - Auto-discovers `.oxfmtrc.json`, `.oxfmtrc.jsonc`, `oxfmt.config.ts`, and `oxfmt.config.mts`, and also supports explicit `.json` / `.jsonc` / `.js` / `.mjs` / `.cjs` / `.ts` / `.mts` / `.cts` config paths
- 🧩 **EditorConfig fallback** - Merges supported `.editorconfig` fields into the returned oxfmt config result
- 🚫 **Ignore resolution** - Resolves ignore status with oxfmt CLI-like global + config-scoped semantics
- ⚡ **Built-in caching** - Caches both file resolution and parsed configs for optimal performance
- 🎯 **TypeScript support** - Fully typed with comprehensive type definitions
- 🛠️ **Flexible API** - Support explicit config paths or automatic discovery

## Install

```shell
npm install oxfmt load-oxfmt-config
```

```shell
yarn add oxfmt load-oxfmt-config
```

```shell
pnpm add oxfmt load-oxfmt-config
```

> `oxfmt >=0.70.0` is a peer dependency and is installed alongside this package.
> Node.js `^22.13.0 || >=24` is supported.

## Usage

### Basic Usage

Load config from current directory or parent directories:

```ts
import { loadOxfmtConfig } from 'load-oxfmt-config'

// Automatically searches for oxfmt config files and the nearest .editorconfig
const result = await loadOxfmtConfig()
console.log(result.config) // { printWidth: 80, ... }
```

### Merge With `.editorconfig`

```ts
import { loadOxfmtConfig } from 'load-oxfmt-config'

const result = await loadOxfmtConfig({ cwd: '/path/to/project' })

// Returns one merged static config object
console.log(result.config)
// {
//   tabWidth: 2,
//   printWidth: 100,
//   overrides: [
//     { files: ['src/**/*.ts'], options: { printWidth: 120 } }
//   ]
// }
```

### Specify Working Directory

```ts
import { loadOxfmtConfig } from 'load-oxfmt-config'

const result = await loadOxfmtConfig({
  cwd: '/path/to/project',
})
```

### Get Config Metadata

```ts
import { loadOxfmtConfig } from 'load-oxfmt-config'

const result = await loadOxfmtConfig({ cwd: '/path/to/project' })

console.log(result.config) // merged oxfmt options
console.log(result.filepath) // /path/to/project/.oxfmtrc.json (or undefined)
console.log(result.dirname) // /path/to/project (or undefined)
```

### Resolve Ignore Status

```ts
import { isOxfmtIgnored } from 'load-oxfmt-config'

const result = await isOxfmtIgnored({
  cwd: '/path/to/project',
  filepath: '/path/to/project/src/generated/foo.ts',
})

console.log(result)
// { ignored: true, reason: 'config-ignore-patterns' }
```

### Explicit Config Path

```ts
import { loadOxfmtConfig } from 'load-oxfmt-config'

// Relative path (resolved relative to cwd)
const result = await loadOxfmtConfig({
  configPath: 'configs/.oxfmtrc.json',
  cwd: '/path/to/project',
})

// Absolute path
const absoluteResult = await loadOxfmtConfig({
  configPath: '/absolute/path/to/.oxfmtrc.json',
})
```

### Disable `.editorconfig`

```ts
import { loadOxfmtConfig } from 'load-oxfmt-config'

// Skip .editorconfig reading entirely
const result = await loadOxfmtConfig({
  editorconfig: false,
})
```

### Limit `.editorconfig` to `cwd`

```ts
import { loadOxfmtConfig } from 'load-oxfmt-config'

// Only look in the cwd directory itself, no upward traversal
const result = await loadOxfmtConfig({
  editorconfig: { onlyCwd: true },
})
```

### Override `.editorconfig` Search Directory

```ts
import { loadOxfmtConfig } from 'load-oxfmt-config'

// Search .editorconfig from a custom directory instead of the config file's directory
const result = await loadOxfmtConfig({
  editorconfig: {
    cwd: '/path/to/editorconfig-dir',
  },
})
```

### Disable Caching

```ts
import { loadOxfmtConfig } from 'load-oxfmt-config'

// Force reload from disk, bypassing cache
const result = await loadOxfmtConfig({
  useCache: false,
})
```

### Path Resolution Only

```ts
import { resolveOxfmtrcPath } from 'load-oxfmt-config'

// Only resolve the config file path without loading it
const configPath = await resolveOxfmtrcPath(process.cwd())
console.log(configPath) // '/path/to/.oxfmtrc.json' or undefined
```

## API

### `loadOxfmtConfig(options?)`

Load and parse oxfmt configuration files, merge supported `.editorconfig` fields, and return metadata for the resolved config file.

**Parameters:**

- `options` - Optional configuration object (`LoadOxfmtConfigOptions`)

Option fields:

#### `cwd`

- **Type:** `string`
- **Default:** `process.cwd()`

Current working directory for config resolution.
By default config discovery starts here, unless `filepath` is provided.

#### `filepath`

- **Type:** `string`
- **Default:** `undefined`

Target file path for nested config resolution.
When provided (and `configPath` is not set), config discovery starts from `dirname(filepath)` and walks upward to match oxfmt per-file semantics.

#### `configPath`

- **Type:** `string`
- **Default:** `undefined`

Explicit path to the config file:

- **Relative path:** Resolved relative to `cwd`
- **Absolute path:** Used as-is
- **When provided:** Skips auto-discovery and uses this path directly

#### `disableNestedConfig`

- **Type:** `boolean`
- **Default:** `false`

Disable nested config lookup.
When `true`, config discovery is anchored to `cwd` (or explicit `configPath`) instead of `filepath`.

#### `useCache`

- **Type:** `boolean`
- **Default:** `true`

Enable in-memory caching for both path resolution and parsed config contents. When enabled:

- Config file paths are cached to avoid repeated filesystem lookups
- Parsed config objects are cached to avoid re-parsing
- Subsequent calls with the same parameters return cached results instantly

Set to `false` to force reload from disk on every call.

#### `editorconfig`

- **Type:** `boolean | EditorconfigOption`
- **Default:** `true`

Control how `.editorconfig` files are read and merged:

- **`true`** — Read and merge the nearest `.editorconfig`, walking up from the config-discovery start directory:
  - `dirname(filepath)` when nested lookup is enabled and `filepath` is provided
  - otherwise `cwd`
- **`false`** — Disable `.editorconfig` reading entirely.
- **`EditorconfigOption`** — Enable with additional settings:

| Property  | Type      | Default     | Description                                                                                                   |
| --------- | --------- | ----------- | ------------------------------------------------------------------------------------------------------------- |
| `onlyCwd` | `boolean` | `false`     | When `true`, only look for `.editorconfig` in `cwd` itself — no upward traversal.                             |
| `cwd`     | `string`  | `undefined` | Override the directory from which `.editorconfig` resolution starts, instead of the default lookup directory. |

**Returns:** `Promise<LoadOxfmtConfigResult>`

- `config` - Parsed and merged oxfmt configuration object
- `filepath` - Resolved config absolute path (undefined when not found)
- `dirname` - Config directory (undefined when not found)

**Throws:** Error if config file exists but cannot be parsed.

### `resolveOxfmtrcPath(cwd, configPath?)`

Resolve the absolute path to oxfmt config file.

**Parameters:**

- `cwd` - Starting directory for resolution
- `configPath` - Optional explicit path (absolute or relative to cwd)

**Returns:** `Promise<string | undefined>` - Absolute path to config file, or `undefined` if not found.

### `isOxfmtIgnored(options)`

Resolve whether a file should be ignored with oxfmt CLI-like semantics.

**Parameters:**

- `options` - Required configuration object (`IsOxfmtIgnoredOptions`)

Option fields:

#### `cwd`

- **Type:** `string`
- **Default:** `process.cwd()`

Current working directory.
Also the base directory for default `.prettierignore` lookup.

#### `filepath`

- **Type:** `string`
- **Default:** required

File path to test.

#### `configPath`

- **Type:** `string`
- **Default:** `undefined`

Explicit oxfmt config path.
When provided, nested config lookup is disabled (same as oxfmt CLI `-c`).

#### `ignorePath`

- **Type:** `string | string[]`
- **Default:** `undefined`

Ignore files to use instead of the default cwd `.prettierignore`.
Can be passed multiple times in CLI style.
Explicit ignore paths do not replace `.gitignore` or `.git/info/exclude` handling.

#### `withNodeModules`

- **Type:** `boolean`
- **Default:** `false`

Whether `node_modules` should be included.

#### `disableNestedConfig`

- **Type:** `boolean`
- **Default:** `false`

Disable nested config lookup.

#### `useCache`

- **Type:** `boolean`
- **Default:** `true`

Whether to use in-memory cache.

#### `includeConfigIgnorePatterns`

- **Type:** `boolean`
- **Default:** `true`

Whether to include ignore patterns defined in the resolved config file.

#### `loadConfigForIgnorePatterns`

- **Type:** `boolean`
- **Default:** `true`

Whether to load the resolved config file during ignore checks.
When `false`, `isOxfmtIgnored()` only applies global ignore and skips config loading.

**Returns:** `Promise<IsOxfmtIgnoredResult>`

- `ignored` - Whether the file is ignored
- `reason` - One of:
  - `default-dir`
  - `lockfile`
  - `gitignore`
  - `git-info-exclude`
  - `prettierignore`
  - `ignore-path`
  - `config-ignore-patterns`

## Config File Discovery

When `configPath` is not provided, the loader automatically searches for config files:

1. **Search order:** Starts from `dirname(filepath)` when `filepath` is provided **and nested lookup is enabled**; otherwise starts from `cwd`, then walks up to parent directories
2. **Supported filenames:**
   - `.oxfmtrc.json`
   - `.oxfmtrc.jsonc`
   - `oxfmt.config.ts`
   - `oxfmt.config.mts`
3. **Stops when:**
   - A valid config file is found
   - Reaches the filesystem root
4. **EditorConfig:** The nearest `.editorconfig` is resolved from the same start directory and merged into the returned result
5. **Returns:** Empty object `{}` if no config file is found

## Supported Config Formats

### JSON (`.oxfmtrc.json`)

```json
{
  "printWidth": 100,
  "tabWidth": 2,
  "useTabs": false,
  "semi": true,
  "singleQuote": true
}
```

### JSONC (`.oxfmtrc.jsonc`)

JSON with comments support:

```jsonc
{
  // Formatting options
  "printWidth": 100,
  "tabWidth": 2,

  /* Code style preferences */
  "useTabs": false,
  "semi": true,
  "singleQuote": true,
}
```

### TypeScript (`oxfmt.config.ts` / `oxfmt.config.mts`)

```ts
export default {
  printWidth: 100,
  tabWidth: 2,
}
```

> JavaScript and TypeScript config files are executed while loading config. Only load them from repositories you trust.

JavaScript and TypeScript config files must provide a default export whose value is an object.
When `configPath` is passed explicitly, extensions `.json`, `.jsonc`, `.ts`, `.mts`, `.cts`, `.js`, `.mjs`, and `.cjs` are supported. Extensionless paths are also accepted and parsed as JSON.

## `.editorconfig` Support

The loader reads the nearest `.editorconfig` file and maps the subset of fields that oxfmt supports:

- `end_of_line` → `endOfLine`
- `indent_style` → `useTabs`
- `indent_size` → `tabWidth` when `indent_style = space`
- `tab_width` → `tabWidth`
- `max_line_length` → `printWidth`
- `insert_final_newline` → `insertFinalNewline`
- `quote_type` → `singleQuote`

Only `[*]` is treated as a global section to match oxfmt. Other sections such as `[**]` and `[*.ts]` are converted into returned `overrides` entries.

## Ignore Strategy

`isOxfmtIgnored()` applies two layers:

1. Global ignore
2. Ignore patterns from the resolved oxfmt config (`ignorePatterns`)

Set `includeConfigIgnorePatterns: false` to skip config `ignorePatterns` matching.
Set `loadConfigForIgnorePatterns: false` to skip config loading entirely and keep only global ignore behavior.

Global ignore includes:

- Default ignored directories: `.git`, `.jj`, `.sl`, `.svn`, `.hg`, `node_modules`
- Default lockfiles: `package-lock.json`, `pnpm-lock.yaml`, `yarn.lock`, `MODULE.bazel.lock`, `bun.lock`, `deno.lock`, `composer.lock`, `Package.resolved`, `Pipfile.lock`, `flake.lock`, `Cargo.lock`, `Gopkg.lock`, `pdm.lock`, `poetry.lock`, `uv.lock`, `npm-shrinkwrap.json`, `bun.lockb`
- Ignore files:
  - Always read `.gitignore` from the file's directory upward until the git repo boundary
  - Always read `<repo>/.git/info/exclude` when inside a git repo
  - If `ignorePath` is provided: read those files instead of `cwd/.prettierignore`
  - If `ignorePath` is not provided: read `.prettierignore` from `cwd`

Notes:

- `node_modules` can be included by passing `withNodeModules: true`.

- The default lockfile list mirrors oxfmt documentation intent (`package-lock.json`, `pnpm-lock.yaml`, etc.) and common ecosystem lockfiles. It is not guaranteed to be a complete internal oxfmt list.
- `ignorePatterns` use gitignore semantics and are interpreted relative to the resolved oxfmt config directory. Parent-directory (`..`) path segments are rejected because patterns cannot match files outside that directory.
- `includeConfigIgnorePatterns` defaults to `true` to preserve current behavior.
- `loadConfigForIgnorePatterns` defaults to `true` to preserve current behavior.
- Nested config behavior follows oxfmt semantics:
  - default: nearest config from target file directory upward
  - `disableNestedConfig: true`: resolve from `cwd` only
  - `configPath`: also disables nested lookup (same intent as CLI `-c`)
  - invalid nested config only fails files that resolve to that config (no project-wide pre-scan)

## Precedence

The merged result follows oxfmt's fallback semantics:

1. Root and section-specific `.editorconfig` values provide defaults for unset fields
2. Root-level values from `.oxfmtrc.json`, `.oxfmtrc.jsonc`, `oxfmt.config.ts`, or `oxfmt.config.mts` take precedence over all `.editorconfig` values
3. Overrides declared directly in the oxfmt config file have the highest priority

Section-specific `.editorconfig` entries are represented as generated `overrides` in the static result. Fields already defined at the oxfmt config root are omitted from those generated overrides, and explicit oxfmt `overrides` are appended after them.

## Limitations

`loadOxfmtConfig()` returns a static merged `OxfmtOptions` shape. That means `.editorconfig` support is represented as merged root + overrides config data, not as per-file runtime evaluation. In practice this works well for common root settings and section-based overrides, but it is not a full replacement for oxfmt's own file-by-file config resolution.

## Error Handling

```ts
import { loadOxfmtConfig } from 'load-oxfmt-config'

try {
  const result = await loadOxfmtConfig()
  console.log(result.config)
} catch (error) {
  // Thrown when a resolved config file cannot be parsed or loaded
  console.error('Failed to parse oxfmt config:', error.message)
}
```

## Caching Behavior

The caching system maintains two separate caches:

1. **Path Resolution Cache:** Stores resolved config file paths
2. **Config Content Cache:** Stores parsed configuration objects

**Cache keys are based on:**

- `cwd` + `configPath` for path resolution
- or `dirname(filepath)` + `configPath` when `filepath` is provided and nested lookup is enabled
- Resolved oxfmt path and resolved `.editorconfig` path for config content

**Cache invalidation:**

- Failed operations automatically clear their cache entries
- Use `useCache: false` to bypass cache for specific calls
- Each process-level cache retains at most 1,000 least-recently used entries
- For native ESM config files (`.mjs` or `.js` under `"type": "module"`), `useCache: false` cache-busts the entry config file. Imported ESM helper modules still follow Node.js module cache behavior for the current process.
- Cache entries persist until least-recently used eviction or process exit

## Related

- [oxfmt](https://oxc.rs/docs/guide/usage/formatter.html) - The Oxidation Compiler formatter
- [oxc](https://oxc.rs/) - The JavaScript Oxidation Compiler

## License

[MIT](https://github.com/ntnyq/eslint-plugin-oxfmt/blob/main/LICENSE) License © 2025-PRESENT [ntnyq](https://github.com/ntnyq)
