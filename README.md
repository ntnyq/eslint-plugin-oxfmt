# eslint-plugin-oxfmt

[![CI](https://github.com/ntnyq/eslint-plugin-oxfmt/workflows/CI/badge.svg)](https://github.com/ntnyq/eslint-plugin-oxfmt/actions)
[![NPM VERSION](https://img.shields.io/npm/v/eslint-plugin-oxfmt.svg)](https://www.npmjs.com/package/eslint-plugin-oxfmt)
[![NPM DOWNLOADS](https://img.shields.io/npm/dy/eslint-plugin-oxfmt.svg)](https://www.npmjs.com/package/eslint-plugin-oxfmt)
[![LICENSE](https://img.shields.io/github/license/ntnyq/eslint-plugin-oxfmt.svg)](https://github.com/ntnyq/eslint-plugin-oxfmt/blob/main/LICENSE)

> An ESLint plugin for formatting code with [oxfmt](https://github.com/oxc-project/oxc) - A blazing fast formatter powered by Rust.

## Features

- ⚡️ **Blazing Fast** - Powered by [oxfmt](https://github.com/oxc-project/oxc), written in Rust
- 🔧 **Auto-fix** - Automatically format code on save or via ESLint's fix command
- 🎯 **ESLint Integration** - Seamlessly integrates with ESLint v9+ flat config
- 📦 **Zero Config** - Works out of the box with sensible defaults
- 🧩 **Config File Discovery** - Auto-discovers `.oxfmtrc.json`, `.oxfmtrc.jsonc`, and `oxfmt.config.*`
- 📝 **EditorConfig Integration** - Respects a subset of `.editorconfig` options via [oxfmt's strategy](https://oxc.rs/docs/guide/usage/formatter/config#editorconfig)
- 🎨 **Highly Configurable** - Supports all oxfmt formatting options
- 🌐 **Multi-language Support** - JavaScript, TypeScript, JSX, TSX and [more](https://oxc.rs/docs/guide/usage/formatter.html#supported-languages)

## Requirements

- **ESLint**: `>= 9.0.0` (Only supports ESLint flat config)
- **Node.js**: `^20.19.0 || >=22.12.0`

## Installation

```shell
npm install -D oxfmt eslint-plugin-oxfmt
```

```shell
yarn add -D oxfmt eslint-plugin-oxfmt
```

```shell
pnpm add -D oxfmt eslint-plugin-oxfmt
```

## Usage

### Quick Start

Add the plugin to your ESLint flat config file:

```js
// eslint.config.mjs
import pluginOxfmt from 'eslint-plugin-oxfmt'

export default [
  {
    ...pluginOxfmt.configs.recommended,
    files: ['**/*.{js,ts,mjs,cjs,jsx,tsx}'],
  },
]
```

`recommended` includes `eslint-parser-plain` as `languageOptions.parser` for convenience.

If you need parser-agnostic composition (for example to keep `jsonc-eslint-parser` from another config), use the dedicated preset:

```js
// eslint.config.mjs
import pluginOxfmt from 'eslint-plugin-oxfmt'

export default [
  {
    ...pluginOxfmt.configs.recommendedWithoutParser,
    files: ['**/*.{js,ts,mjs,cjs,jsx,tsx,json,jsonc}'],
  },
]
```

For CLI-like ignore/config behavior, use `cliParity`:

```js
// eslint.config.mjs
import pluginOxfmt from 'eslint-plugin-oxfmt'

export default [
  {
    ...pluginOxfmt.configs.cliParity,
    files: ['**/*.{js,ts,mjs,cjs,jsx,tsx,svelte,json,jsonc,yaml,yml}'],
  },
]
```

### Custom Configuration

You can customize the formatting options by configuring the rule:

```js
// eslint.config.mjs
import pluginOxfmt from 'eslint-plugin-oxfmt'

export default [
  {
    ...pluginOxfmt.configs.recommended,
    files: ['**/*.{js,ts,mjs,cjs,jsx,tsx}'],
    rules: {
      'oxfmt/oxfmt': [
        'error',
        {
          // Plugin options
          useConfig: false,
          configPath: 'configs/.oxfmtrc.json',

          // Formatting options
          semi: false,
          singleQuote: true,
          tabWidth: 2,
          useTabs: false,
          trailingComma: 'all',
          printWidth: 100,
          arrowParens: 'avoid',

          // File handling
          ignorePatterns: ['**/dist/**', '**/.next/**'],

          // JSX specific options
          jsxSingleQuote: false,
          bracketSameLine: false,
          singleAttributePerLine: false,

          // Object formatting
          bracketSpacing: true,
          quoteProps: 'as-needed',
          objectWrap: 'preserve',

          // Line endings
          endOfLine: 'lf',
          insertFinalNewline: true,

          // Prose / HTML
          embeddedLanguageFormatting: 'auto',
          htmlWhitespaceSensitivity: 'css',
          proseWrap: 'preserve',

          // JSDoc
          jsdoc: {
            commentLineStrategy: 'singleLine',
            lineWrappingStyle: 'greedy',
            separateTagGroups: false,
          },

          // Vue
          vueIndentScriptAndStyle: false,

          // Advanced
          sortImports: {
            order: 'asc',
            newlinesBetween: true,
          },
          sortPackageJson: { sortScripts: true },
          sortTailwindcss: {
            attributes: ['class', 'className', ':class'],
            functions: ['clsx', 'cn'],
            preserveDuplicates: false,
            preserveWhitespace: false,
          },
        },
      ],
    },
  },
]
```

## Configuration Options

All options are optional and default to sensible values.

### Plugin Options

| Option                       | Type                                             | Default | Description                                                                                                                                                                                                  |
| ---------------------------- | ------------------------------------------------ | ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `useConfig`                  | `boolean`                                        | `true`  | Load `.oxfmtrc.json`, `.oxfmtrc.jsonc`, or `oxfmt.config.*` via `load-oxfmt-config`. Set to `false` to rely only on inline options.                                                                          |
| `configPath`                 | `string`                                         | —       | Custom path to an oxfmt config file. Relative paths resolve from ESLint `cwd`; absolute paths are used as-is. Explicit `configPath` accepts `.json`, `.jsonc`, `.ts`, `.mts`, `.cts`, `.js`, `.mjs`, `.cjs`. |
| `editorconfig`               | `boolean \| { onlyCwd?: boolean; cwd?: string }` | `true`  | Control `.editorconfig` loading. Use `false` to disable, or object form for advanced resolution strategy.                                                                                                    |
| `ignorePath`                 | `string \| string[]`                             | —       | Ignore file path(s) for CLI-style ignore resolution (same role as CLI `--ignore-path`).                                                                                                                      |
| `withNodeModules`            | `boolean`                                        | `false` | Include files under `node_modules` during ignore checks.                                                                                                                                                     |
| `disableNestedConfig`        | `boolean`                                        | `false` | Disable nested config discovery and resolve config from `cwd` / `configPath` only.                                                                                                                           |
| `respectOxfmtDefaultIgnores` | `boolean`                                        | `true`  | Respect oxfmt default ignores (`.gitignore`, `.prettierignore`, default ignored directories, default ignored lockfiles).                                                                                     |

> Note: `cwd` is taken from ESLint automatically; you usually do not need to set it manually.
> `.editorconfig` merge behavior follows oxfmt's documented strategy: https://oxc.rs/docs/guide/usage/formatter/config#editorconfig

### Config Discovery & Precedence

When `useConfig` is `true`, the plugin loads config using `load-oxfmt-config`.

- Config discovery order (from `cwd`, walking upward): `.oxfmtrc.json` → `.oxfmtrc.jsonc` → `oxfmt.config.ts` / `oxfmt.config.mts` / `oxfmt.config.cts` / `oxfmt.config.js` / `oxfmt.config.mjs` / `oxfmt.config.cjs`
- `.editorconfig` support: nearest `.editorconfig` (including section overrides) is merged into the final options
- Set `editorconfig: false` to disable `.editorconfig` merging
- Set `editorconfig: { onlyCwd: true }` to read only the current `cwd`'s `.editorconfig` (no upward traversal)
- Set `editorconfig: { cwd: '/path/to/base' }` to customize editorconfig resolution base directory
- `configPath` overrides discovery and directly targets the specified config file
- `configPath` supports explicit file paths with extensions: `.json`, `.jsonc`, `.ts`, `.mts`, `.cts`, `.js`, `.mjs`, `.cjs`
- ESLint rule options generally take highest priority because inline rule options are merged after loaded config.
- Rule-level `ignorePatterns` are resolved relative to ESLint `cwd`; config-level `ignorePatterns` are resolved relative to the resolved config file directory.
- When `useConfig` is `true`, config `overrides` are applied first and rule-level `overrides` are appended after them (later entries win on conflicts).
- When `useConfig` is `false`, config discovery and config `ignorePatterns` are skipped, while global ignores still apply when `respectOxfmtDefaultIgnores` is enabled.

For detailed behavior, see:

- [Oxfmt configuration](https://oxc.rs/docs/guide/usage/formatter/config)
- [Oxfmt `.editorconfig` strategy](https://oxc.rs/docs/guide/usage/formatter/config#editorconfig)

### Basic Options

| Option           | Type       | Default | Description                                                                                                                                            |
| ---------------- | ---------- | ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `semi`           | `boolean`  | `true`  | Add semicolons at the end of statements                                                                                                                |
| `singleQuote`    | `boolean`  | `false` | Use single quotes instead of double quotes                                                                                                             |
| `tabWidth`       | `number`   | `2`     | Number of spaces per indentation level                                                                                                                 |
| `useTabs`        | `boolean`  | `false` | Use tabs for indentation                                                                                                                               |
| `printWidth`     | `number`   | `100`   | Maximum line length for wrapping                                                                                                                       |
| `ignorePatterns` | `string[]` | `[]`    | Glob patterns to skip formatting. Rule option patterns are resolved from ESLint cwd; config file patterns are resolved from the config file directory. |

### Trailing Commas

| Option          | Type                       | Default | Description                  |
| --------------- | -------------------------- | ------- | ---------------------------- |
| `trailingComma` | `'all' \| 'es5' \| 'none'` | `'all'` | Where to add trailing commas |

### Arrow Functions

| Option        | Type                  | Default    | Description                                              |
| ------------- | --------------------- | ---------- | -------------------------------------------------------- |
| `arrowParens` | `'always' \| 'avoid'` | `'always'` | Include parentheses around sole arrow function parameter |

### JSX Options

| Option                   | Type      | Default | Description                            |
| ------------------------ | --------- | ------- | -------------------------------------- |
| `jsxSingleQuote`         | `boolean` | `false` | Use single quotes in JSX attributes    |
| `bracketSameLine`        | `boolean` | `false` | Put `>` on the same line in JSX        |
| `singleAttributePerLine` | `boolean` | `false` | Force single attribute per line in JSX |

### Vue SFC Options

| Option                    | Type      | Default | Description                                      |
| ------------------------- | --------- | ------- | ------------------------------------------------ |
| `vueIndentScriptAndStyle` | `boolean` | `false` | Indent code inside `<script>` / `<style>` in Vue |

### Object Formatting

| Option           | Type                                        | Default       | Description                                      |
| ---------------- | ------------------------------------------- | ------------- | ------------------------------------------------ |
| `bracketSpacing` | `boolean`                                   | `true`        | Print spaces between brackets in object literals |
| `quoteProps`     | `'as-needed' \| 'consistent' \| 'preserve'` | `'as-needed'` | When to quote object property names              |
| `objectWrap`     | `'preserve' \| 'collapse'`                  | `'preserve'`  | How to wrap object literals                      |

### Line Endings

| Option               | Type                     | Default | Description                          |
| -------------------- | ------------------------ | ------- | ------------------------------------ |
| `endOfLine`          | `'lf' \| 'crlf' \| 'cr'` | `'lf'`  | Line ending character(s)             |
| `insertFinalNewline` | `boolean`                | `true`  | Insert a newline at the end of files |

### Prose / HTML

| Option                       | Type                                | Default      | Description                                              |
| ---------------------------- | ----------------------------------- | ------------ | -------------------------------------------------------- |
| `embeddedLanguageFormatting` | `'auto' \| 'off'`                   | `'auto'`     | Format embedded code blocks (e.g., JS-in-Vue, CSS-in-JS) |
| `htmlWhitespaceSensitivity`  | `'css' \| 'ignore' \| 'strict'`     | `'css'`      | Global whitespace sensitivity for HTML-like languages    |
| `proseWrap`                  | `'always' \| 'never' \| 'preserve'` | `'preserve'` | Control prose wrapping in Markdown/MDX                   |

### JSDoc Options

Use `jsdoc` to enable and configure JSDoc comment formatting. Pass `true` to enable defaults, or pass an object for custom behavior (for example `jsdoc: {}`).

| Option                              | Type                                    | Default        | Description                                            |
| ----------------------------------- | --------------------------------------- | -------------- | ------------------------------------------------------ |
| `jsdoc.commentLineStrategy`         | `'singleLine' \| 'multiline' \| 'keep'` | `'singleLine'` | Comment block style policy                             |
| `jsdoc.lineWrappingStyle`           | `'greedy' \| 'balance'`                 | `'greedy'`     | Wrapping strategy for long descriptions                |
| `jsdoc.addDefaultToDescription`     | `boolean`                               | `true`         | Append default values to `@param` descriptions         |
| `jsdoc.bracketSpacing`              | `boolean`                               | `false`        | Add spaces inside JSDoc type braces                    |
| `jsdoc.capitalizeDescriptions`      | `boolean`                               | `true`         | Capitalize the first letter of tag descriptions        |
| `jsdoc.descriptionTag`              | `boolean`                               | `false`        | Emit `@description` tag instead of inline description  |
| `jsdoc.descriptionWithDot`          | `boolean`                               | `false`        | Add a trailing dot to the end of descriptions          |
| `jsdoc.keepUnparsableExampleIndent` | `boolean`                               | `false`        | Preserve indentation in unparsable `@example` code     |
| `jsdoc.preferCodeFences`            | `boolean`                               | `false`        | Prefer fenced code blocks over 4-space indentation     |
| `jsdoc.separateReturnsFromParam`    | `boolean`                               | `false`        | Add a blank line between final `@param` and `@returns` |
| `jsdoc.separateTagGroups`           | `boolean`                               | `false`        | Add blank lines between different tag groups           |

Tip: `jsdoc: true` is equivalent to enabling JSDoc with default settings.

### Advanced Options

| Option            | Type                | Default  | Description                                                                  |
| ----------------- | ------------------- | -------- | ---------------------------------------------------------------------------- |
| `sortImports`     | `boolean \| object` | disabled | Experimental import sorting configuration                                    |
| `sortPackageJson` | `boolean \| object` | `true`   | Experimental package.json sorting (object form: `{ sortScripts?: boolean }`) |
| `sortTailwindcss` | `boolean \| object` | disabled | Experimental Tailwind CSS class sorting (enable with `{}` for defaults)      |
| `svelte`          | `boolean \| object` | disabled | Enable/configure `.svelte` formatting via `prettier-plugin-svelte`           |

#### Import sorting (`sortImports`)

Use `sortImports: true` to enable import sorting with defaults, or pass an object to customize behavior.

Available keys:

- `customGroups`: Ordered custom group definitions `{ elementNamePattern?: string[]; groupName?: string; modifiers?: string[]; selector?: string }[]`
- `groups`: Ordered group list; supports nested arrays and boundary markers like `{ newlinesBetween: boolean }`
- `ignoreCase`: Ignore case when sorting (default `true`)
- `internalPattern`: Glob patterns for internal imports
- `newlinesBetween`: Insert blank lines between groups (default `true`)
- `order`: `'asc' | 'desc'` (default `'asc'`)
- `partitionByComment`: Split groups by comments (default `false`)
- `partitionByNewline`: Split groups by blank lines (default `false`)
- `sortSideEffects`: Sort side-effect imports (default `false`)

#### package.json sorting (`sortPackageJson`)

- Boolean to toggle (default `true`).
- Object form: `{ sortScripts?: boolean }` (default `false`).

#### Tailwind CSS class sorting

Enable experimental Tailwind CSS class sorting powered by `prettier-plugin-tailwindcss` (set `sortTailwindcss: true` for defaults, or pass an object for custom options):

```js
// eslint.config.mjs
import pluginOxfmt from 'eslint-plugin-oxfmt'

export default [
  {
    ...pluginOxfmt.configs.recommended,
    files: ['**/*.{js,ts,jsx,tsx}'],
    rules: {
      'oxfmt/oxfmt': [
        'error',
        {
          sortTailwindcss: {},
        },
      ],
    },
  },
]
```

You can pass the Tailwind plugin options to control which attributes/functions are sorted or keep duplicates:

```json
{
  "sortTailwindcss": {
    "attributes": ["class", "className", ":class"],
    "config": "./tailwind.config.js",
    "functions": ["clsx", "cn"],
    "preserveDuplicates": false,
    "preserveWhitespace": false,
    "stylesheet": "./src/app.css"
  }
}
```

## File-specific overrides

Use `overrides` to apply different oxfmt options per file glob (later entries win on conflicts):

```js
// eslint.config.mjs
import pluginOxfmt from 'eslint-plugin-oxfmt'

export default [
  {
    ...pluginOxfmt.configs.recommended,
    files: ['**/*.{js,ts,jsx,tsx}'],
    rules: {
      'oxfmt/oxfmt': [
        'error',
        {
          overrides: [
            {
              files: ['**/*.test.ts'],
              excludeFiles: ['**/fixtures/**'],
              options: {
                semi: false,
                trailingComma: 'none',
              },
            },
            {
              files: ['packages/**/src/**/*.{ts,tsx}'],
              options: {
                printWidth: 90,
                sortImports: {
                  newlinesBetween: true,
                },
              },
            },
          ],
        },
      ],
    },
  },
]
```

## Rules

### `oxfmt/oxfmt`

This plugin provides a single rule that formats your code using oxfmt.

- Recommended: `error`
- Fixable: Yes (automatically applies formatting)
- Type: Layout

## CLI parity mode

`oxfmt/cli-parity` tries to match `oxfmt` CLI behavior for files processed by ESLint.

It respects:

- `.oxfmtrc.json`
- `.oxfmtrc.jsonc`
- `oxfmt.config.*`
- `.editorconfig`
- `ignorePatterns`
- `.gitignore`
- parent `.gitignore`
- `.git/info/exclude`
- `.prettierignore`
- default ignored directories
- default ignored lockfiles

Note: ESLint still controls file discovery. Files excluded by ESLint will never reach this rule.

## Integration

### Parser Compatibility

- `recommended`: forces `eslint-parser-plain` for matched files
- `recommendedWithoutParser`: parser-agnostic (safe to compose with language-specific parsers)
- `cliParity`: parser-agnostic preset tuned for CLI-like config/ignore behavior

When composing shareable configs, prefer `recommendedWithoutParser` if parser ownership belongs to another preset.

### Format on Save in VS Code

Add this to your `.vscode/settings.json`:

```json
{
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": "explicit"
  },
  "eslint.validate": [
    "javascript",
    "javascriptreact",
    "typescript",
    "typescriptreact"
  ]
}
```

## Supported languages

- Check [Oxfmt - Supported languages](https://oxc.rs/docs/guide/usage/formatter.html#supported-languages)

## Why oxfmt?

[oxfmt](https://github.com/oxc-project/oxc) is a modern, blazing-fast formatter written in Rust as part of the [Oxc project](https://oxc-project.github.io/). It aims to be a drop-in replacement for Prettier with significantly better performance.

### Benefits

- **Performance**: 50-100x faster than Prettier
- **Compatibility**: Designed to be Prettier-compatible
- **Modern**: Built with modern JavaScript/TypeScript in mind
- **Maintained**: Part of the actively developed Oxc project

## Related Projects

- [oxc](https://github.com/oxc-project/oxc) - The Oxidation Compiler
- [oxlint](https://github.com/oxc-project/oxc) - A fast linter
- [ESLint](https://eslint.org/) - Pluggable JavaScript linter

## License

[MIT](./LICENSE) License © 2025-PRESENT [ntnyq](https://github.com/ntnyq)
