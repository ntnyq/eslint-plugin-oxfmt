# eslint-plugin-oxfmt

[![CI](https://github.com/ntnyq/eslint-plugin-oxfmt/actions/workflows/ci.yml/badge.svg)](https://github.com/ntnyq/eslint-plugin-oxfmt/actions/workflows/ci.yml)

Format code with [oxfmt](https://oxc.rs/docs/guide/usage/formatter.html) through ESLint, or load oxfmt configuration in your own tools.

## Packages

| Package                                                                  | Purpose                                                                | Documentation                                             |
| ------------------------------------------------------------------------ | ---------------------------------------------------------------------- | --------------------------------------------------------- |
| [eslint-plugin-oxfmt](https://www.npmjs.com/package/eslint-plugin-oxfmt) | ESLint flat-config plugin with formatting fixes and CLI parity presets | [Plugin README](./packages/eslint-plugin-oxfmt/README.md) |
| [load-oxfmt-config](https://www.npmjs.com/package/load-oxfmt-config)     | Config discovery, EditorConfig merging, caching, and ignore resolution | [Loader README](./packages/load-oxfmt-config/README.md)   |

## Quick Start

Both packages require Node.js `^22.13.0 || >=24` and oxfmt `>=0.68.0`.

### ESLint Plugin

Requires ESLint `^9.5.0 || ^10.0.0` with flat config.

```shell
pnpm add -D eslint oxfmt eslint-plugin-oxfmt
```

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

`recommended` includes a plain-text parser. See the [plugin documentation](./packages/eslint-plugin-oxfmt/README.md) for parser-preserving composition, additional languages, and CLI parity behavior.

### Config Loader

```shell
pnpm add oxfmt load-oxfmt-config
```

```ts
import { loadOxfmtConfig } from 'load-oxfmt-config'

const result = await loadOxfmtConfig()
console.log(result.config)
```

See the [loader documentation](./packages/load-oxfmt-config/README.md) for config discovery, EditorConfig support, caching, and ignore resolution.

## Development

Run commands from the repository root using the pnpm version pinned in `package.json`.

```shell
pnpm install --frozen-lockfile
pnpm build
pnpm test
```

| Command                             | Purpose                                                                     |
| ----------------------------------- | --------------------------------------------------------------------------- |
| `pnpm build`                        | Build both packages and regenerate plugin rule types                        |
| `pnpm dev`                          | Build once, then watch both packages                                        |
| `pnpm test`                         | Run both packages' tests; build first                                       |
| `pnpm check:schema`                 | Compare the plugin schema with the installed oxfmt schema                   |
| `pnpm update:rule-options`          | Regenerate the plugin's rule option declarations                            |
| `pnpm format` / `pnpm format:check` | Format or check repository files without loading nested fixture configs     |
| `pnpm lint` / `pnpm typecheck`      | Run repository lint and TypeScript checks                                   |
| `pnpm check:package`                | Inspect publishable package contents without creating tarballs; build first |
| `pnpm release:check`                | Run all checks, including builds, tests, and package validation             |

Run a single suite after building:

```shell
pnpm --filter eslint-plugin-oxfmt test tests/cli-parity.test.ts
pnpm --filter load-oxfmt-config test tests/load-config.test.ts
```

Run `pnpm release:check` before submitting changes. This also verifies loader changes against the plugin.

Branch pushes and pull requests publish preview packages through [pkg.pr.new](./.github/workflows/pkg-pr-new.yml).

## Releases

See [GitHub Releases](https://github.com/ntnyq/eslint-plugin-oxfmt/releases) for release notes. Both packages share one version and one `v<version>` Git tag.

Maintainers can publish from a clean, up-to-date `main` checkout:

```shell
pnpm release
```

The command runs all checks, prompts for a version, then commits, tags, and pushes. The [release workflow](./.github/workflows/release.yml) publishes both packages to npm and creates a GitHub Release. Stable versions use `latest`; prereleases use `next`.

Both npm packages must authorize `ntnyq/eslint-plugin-oxfmt` and workflow `release.yml` as a Trusted Publisher, with direct publishing allowed and no GitHub environment configured.

## Related Projects

- [oxc](https://github.com/oxc-project/oxc) - The Oxidation Compiler
- [oxlint](https://github.com/oxc-project/oxc) - A fast linter
- [ESLint](https://eslint.org/) - Pluggable JavaScript linter

## License

[MIT](./LICENSE) License © 2025-PRESENT [ntnyq](https://github.com/ntnyq)
