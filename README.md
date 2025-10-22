# eslint-plugin-oxfmt

[![CI](https://github.com/ntnyq/eslint-plugin-oxfmt/workflows/CI/badge.svg)](https://github.com/ntnyq/eslint-plugin-oxfmt/actions)
[![NPM VERSION](https://img.shields.io/npm/v/eslint-plugin-oxfmt.svg)](https://www.npmjs.com/package/eslint-plugin-oxfmt)
[![NPM DOWNLOADS](https://img.shields.io/npm/dy/eslint-plugin-oxfmt.svg)](https://www.npmjs.com/package/eslint-plugin-oxfmt)
[![LICENSE](https://img.shields.io/github/license/ntnyq/eslint-plugin-oxfmt.svg)](https://github.com/ntnyq/eslint-plugin-oxfmt/blob/main/LICENSE)

An ESLint plugin that format code via oxfmt.

## Install

```shell
npm install eslint-plugin-oxfmt
```

```shell
yarn add eslint-plugin-oxfmt
```

```shell
pnpm add eslint-plugin-oxfmt
```

## Usage

```ts
// eslint.config.mjs

import pluginOxfmt from 'eslint-plugin-oxfmt'
import { defineConfig } from 'eslint/config'

export default defineConfig([
  {
    ...pluginOxfmt.configs.recommended,
    files: ['**/*.{js,ts,mjs,cjs,jsx,tsx}'],
    rules: {
      'oxfmt/oxfmt': [
        'error',
        {
          semi: false,
          useTabs: true,
          singleAttributePerLine: true,
          trailingComma: 'all',
        },
      ],
    },
  },
])
```

## License

[MIT](./LICENSE) License © 2025-PRESENT [ntnyq](https://github.com/ntnyq)
