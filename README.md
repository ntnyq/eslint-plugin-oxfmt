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
- **Node.js**: `>= 18.0.0`

## Installation

## Installation

```bash
npm install -D eslint-plugin-oxfmt
```

```bash
yarn add -D eslint-plugin-oxfmt
```

```bash
pnpm add -D eslint-plugin-oxfmt
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
          // Formatting options
          semi: false,
          singleQuote: true,
          tabWidth: 2,
          useTabs: false,
          trailingComma: 'all',
          printWidth: 100,
          arrowParens: 'avoid',

          // JSX specific options
          jsxSingleQuote: false,
          bracketSameLine: false,
          singleAttributePerLine: false,

          // Object formatting
          bracketSpacing: true,
          quoteProps: 'as-needed',

          // Line endings
          endOfLine: 'lf',
          insertFinalNewline: true,
        },
      ],
    },
  },
]
```

## Configuration Options

All options are optional and default to sensible values.

### Basic Options

| Option        | Type      | Default | Description                                |
| ------------- | --------- | ------- | ------------------------------------------ |
| `semi`        | `boolean` | `true`  | Add semicolons at the end of statements    |
| `singleQuote` | `boolean` | `false` | Use single quotes instead of double quotes |
| `tabWidth`    | `number`  | `2`     | Number of spaces per indentation level     |
| `useTabs`     | `boolean` | `false` | Use tabs for indentation                   |
| `printWidth`  | `number`  | `100`   | Maximum line length for wrapping           |

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

### Advanced Options

| Option                        | Type              | Default  | Description                               |
| ----------------------------- | ----------------- | -------- | ----------------------------------------- |
| `embeddedLanguageFormatting`  | `'auto' \| 'off'` | `'auto'` | Control formatting of quoted code         |
| `experimentalSortImports`     | `object`          | -        | Experimental import sorting configuration |
| `experimentalSortPackageJson` | `boolean`         | -        | Experimental package.json sorting         |

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

```bash
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
