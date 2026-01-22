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
- 🎨 **Highly Configurable** - Support for all oxfmt formatting options
- 🌐 **Multi-language Support** - JavaScript, TypeScript, JSX, TSX and more

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

          // Vue
          vueIndentScriptAndStyle: false,

          // Experiments
          experimentalSortImports: {
            order: 'asc',
            newlinesBetween: true,
          },
          experimentalSortPackageJson: { sortScripts: true },
          experimentalTailwindcss: {
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

| Option       | Type      | Default | Description                                                                                            |
| ------------ | --------- | ------- | ------------------------------------------------------------------------------------------------------ |
| `useConfig`  | `boolean` | `true`  | Load `.oxfmtrc` / config files via `load-oxfmt-config`. Set to `false` to rely only on inline options. |
| `configPath` | `string`  | —       | Custom path to an oxfmt config file. Resolved from ESLint `cwd` when set.                              |

> Note: `cwd` is taken from ESLint automatically; you usually do not need to set it manually.

### Basic Options

| Option           | Type       | Default | Description                                        |
| ---------------- | ---------- | ------- | -------------------------------------------------- |
| `semi`           | `boolean`  | `true`  | Add semicolons at the end of statements            |
| `singleQuote`    | `boolean`  | `false` | Use single quotes instead of double quotes         |
| `tabWidth`       | `number`   | `2`     | Number of spaces per indentation level             |
| `useTabs`        | `boolean`  | `false` | Use tabs for indentation                           |
| `printWidth`     | `number`   | `100`   | Maximum line length for wrapping                   |
| `ignorePatterns` | `string[]` | `[]`    | Glob patterns (relative to cwd) to skip formatting |

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
| `objectWrap`     | `'preserve' \| 'collapse' \| 'always'`      | `'preserve'`  | How to wrap object literals                      |

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

### Advanced Options

| Option                        | Type                | Default  | Description                                                                  |
| ----------------------------- | ------------------- | -------- | ---------------------------------------------------------------------------- |
| `experimentalSortImports`     | `object`            | disabled | Experimental import sorting configuration                                    |
| `experimentalSortPackageJson` | `boolean \| object` | `true`   | Experimental package.json sorting (object form: `{ sortScripts?: boolean }`) |
| `experimentalTailwindcss`     | `object`            | disabled | Experimental Tailwind CSS class sorting (enable with `{}` for defaults)      |

#### Import sorting (`experimentalSortImports`)

Available keys:

- `customGroups`: Ordered custom group definitions `{ elementNamePattern?: string[]; groupName?: string }[]`
- `groups`: Ordered group list; supports nested arrays to merge groups (see perfectionist docs)
- `ignoreCase`: Ignore case when sorting (default `true`)
- `internalPattern`: Glob patterns for internal imports
- `newlinesBetween`: Insert blank lines between groups (default `true`)
- `order`: `'asc' | 'desc'` (default `'asc'`)
- `partitionByComment`: Split groups by comments (default `false`)
- `partitionByNewline`: Split groups by blank lines (default `false`)
- `sortSideEffects`: Sort side-effect imports (default `false`)

#### package.json sorting (`experimentalSortPackageJson`)

- Boolean to toggle (default `true`).
- Object form: `{ sortScripts?: boolean }` (default `false`).

#### Tailwind CSS class sorting

Enable experimental Tailwind CSS class sorting powered by `prettier-plugin-tailwindcss` (pass an empty object to turn it on):

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
          experimentalTailwindcss: {},
        },
      ],
    },
  },
]
```

You can pass the Tailwind plugin options to control which attributes/functions are sorted or keep duplicates:

```json
{
  "experimentalTailwindcss": {
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
                experimentalSortImports: {
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

## Examples

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

### Run from Command Line

```shell
# Check for formatting issues
npx eslint .

# Fix formatting issues
npx eslint . --fix
```

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
