# eslint-plugin-oxfmt

[![CI](https://github.com/ntnyq/eslint-plugin-oxfmt/actions/workflows/ci.yml/badge.svg)](https://github.com/ntnyq/eslint-plugin-oxfmt/actions/workflows/ci.yml)

Format code with [oxfmt](https://oxc.rs/docs/guide/usage/formatter.html) through ESLint, or load oxfmt configuration in your own tools.

This pnpm monorepo maintains two npm packages together:

| Package                                                                  | Purpose                                                                | Documentation                                             |
| ------------------------------------------------------------------------ | ---------------------------------------------------------------------- | --------------------------------------------------------- |
| [eslint-plugin-oxfmt](https://www.npmjs.com/package/eslint-plugin-oxfmt) | ESLint flat-config plugin with formatting fixes and CLI parity presets | [Plugin README](./packages/eslint-plugin-oxfmt/README.md) |
| [load-oxfmt-config](https://www.npmjs.com/package/load-oxfmt-config)     | Config discovery, EditorConfig merging, caching, and ignore resolution | [Loader README](./packages/load-oxfmt-config/README.md)   |

`load-oxfmt-config` is now maintained here. Its npm package name and public imports are unchanged.

## Quick Start

Requires Node.js `^22.13.0 || >=24`, ESLint `^9.5.0 || ^10.0.0`, and oxfmt `>=0.67.0`.
The monorepo migration aligns the plugin's Node.js requirement with its loader dependency; Node.js 20 is no longer supported.

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

To use only the config loader:

```shell
pnpm add oxfmt load-oxfmt-config
```

```ts
import { loadOxfmtConfig } from 'load-oxfmt-config'

const result = await loadOxfmtConfig()
console.log(result.config)
```

## Development

Use the pnpm version pinned in the root `package.json`.

```shell
pnpm install --frozen-lockfile
pnpm build
pnpm test
```

| Command                             | Purpose                                                                     |
| ----------------------------------- | --------------------------------------------------------------------------- |
| `pnpm build`                        | Build the loader, regenerate plugin rule types, then build the plugin       |
| `pnpm dev`                          | Build both packages once, then watch both packages concurrently             |
| `pnpm test`                         | Run both packages' tests from their package directories                     |
| `pnpm check:schema`                 | Compare the plugin schema with the installed oxfmt schema                   |
| `pnpm update:rule-options`          | Regenerate the plugin's rule option declarations                            |
| `pnpm format` / `pnpm format:check` | Format or check repository files without loading nested fixture configs     |
| `pnpm lint` / `pnpm typecheck`      | Run repository lint and TypeScript checks                                   |
| `pnpm check:versions`               | Verify both packages use the root version                                   |
| `pnpm check:package`                | Inspect publishable package contents without creating tarballs; build first |
| `pnpm release:check`                | Run version, build, schema, format, lint, type, test, and package checks    |

Run a single suite after building:

```shell
pnpm --filter eslint-plugin-oxfmt test tests/cli-parity.test.ts
pnpm --filter load-oxfmt-config test tests/load-config.test.ts
```

The plugin depends on the local loader through `workspace:^`. pnpm converts this to a normal caret range when packing or publishing. Test loader changes together with the plugin by running `pnpm release:check`.

## Releases

Both packages share one version and one `v<version>` Git tag. The migration baseline is `0.23.0`; choose a newer version for the first shared release.

From a clean, up-to-date `main` checkout:

```shell
pnpm release
```

This runs the release checks, then opens bumpp's version prompt. Bumpp updates the root and both package manifests, refreshes the lockfile, and checks the new version before committing, tagging, and pushing. Generated rule option declarations are committed with the release when they change. Test fixture manifests are excluded from version bumps.

The tag triggers the Release workflow, which verifies that the tag matches all package versions, runs the full checks, publishes the loader before the plugin, then creates the GitHub Release. Stable versions use the npm `latest` tag; prereleases use `next`. If publication only partially succeeds, rerun the same workflow: recursive pnpm publishing skips versions already present on npm.

Before the first release from this repository, configure a [Trusted Publisher](https://docs.npmjs.com/trusted-publishers/) for **each** npm package:

- Owner: `ntnyq`
- Repository: `eslint-plugin-oxfmt`
- Workflow filename: `release.yml`
- Allow direct publishing; no GitHub environment is configured by this workflow.

In particular, the loader's previous repository authorization must be replaced or supplemented with this repository. Repository metadata alone does not update npm authorization.

Pull requests and branch pushes publish both packages through pkg.pr.new after release checks pass. Preview publication requires the pkg.pr.new GitHub app to be installed on this repository.

## Related Projects

- [oxc](https://github.com/oxc-project/oxc) - The Oxidation Compiler
- [oxlint](https://github.com/oxc-project/oxc) - A fast linter
- [ESLint](https://eslint.org/) - Pluggable JavaScript linter

## License

[MIT](./LICENSE) License © 2025-PRESENT [ntnyq](https://github.com/ntnyq)
