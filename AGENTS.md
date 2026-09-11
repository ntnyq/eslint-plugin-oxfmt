# Repository Guidelines

## Project Structure & Module Organization

This pnpm monorepo maintains `eslint-plugin-oxfmt` and `load-oxfmt-config` with a shared version and release tag.

- `packages/eslint-plugin-oxfmt/src/`: plugin exports, presets, rule, schema, and reporting helpers.
- `packages/eslint-plugin-oxfmt/workers/oxfmt.mjs`: worker-side formatting using the local loader package.
- `packages/eslint-plugin-oxfmt/scripts/`: schema validation and rule type generation.
- `packages/eslint-plugin-oxfmt/dts/rule-options.d.ts`: generated rule options; do not hand-edit.
- `packages/load-oxfmt-config/src/`: config discovery/loading, EditorConfig merging, caching, and ignore resolution.
- Each package has its own `tests/`, fixtures, README, and tsdown config.
- Root configuration owns lint, formatting, typechecking, shared Vitest settings, and release orchestration.

## Build, Test, and Development Commands

Run commands from the repository root unless using a package filter.

- `pnpm install --frozen-lockfile`: install pinned workspace dependencies.
- `pnpm build`: build loader first, then regenerate plugin rule types and build plugin.
- `pnpm dev`: initial build followed by concurrent watchers.
- `pnpm test`: run both packages' tests from their package directories; build first.
- `pnpm --filter eslint-plugin-oxfmt test tests/cli-parity.test.ts`: targeted plugin suite.
- `pnpm --filter load-oxfmt-config test tests/load-config.test.ts`: targeted loader suite.
- `pnpm format:check`, `pnpm lint`, `pnpm typecheck`: repository checks.
- `pnpm check:schema`: verify plugin schema parity with upstream oxfmt.
- `pnpm update:rule-options`: regenerate plugin rule option declarations.
- `pnpm check:package`: inspect both package archives without writing tarballs; build first.
- `pnpm release:check`: full gate covering versions, build, schema, formatting, lint, types, tests, and package contents.

Formatting commands disable nested config discovery because test fixtures intentionally include invalid oxfmt configs. Do not format fixtures or regenerate snapshots just to satisfy style checks.

## Coding Style & Naming Conventions

Use TypeScript ESM in source and plain ESM JavaScript in workers. Formatting uses two spaces, LF, no semicolons, single quotes, and trailing commas. Keep public exports and plugin presets stable (`recommended`, `recommendedWithoutParser`, `cliParity`). Preserve option names matching upstream oxfmt.

## Testing Guidelines

Use the nearest package's tests for changed behavior. Plugin rule tests live in `tests/rules/`; config integration, CLI parity, and schema parity have dedicated suites. Loader tests cover config loading, discovery, EditorConfig, and ignore resolution.

Use paths relative to the test module or package helper instead of assuming the repository working directory. Temporary config tests must explicitly provide any imported dependencies. Refresh snapshots only after confirming intended formatter output changes. Run targeted tests first, then `pnpm release:check` before finalizing.

## Commit & Pull Request Guidelines

Use Conventional Commits, such as `fix: resolve workspace config paths` or `chore: release v0.24.0`. PRs should explain behavior changes, dependency/schema updates, and validation. Keep all three package versions synchronized through `bump.config.ts`; fixture manifests are excluded.

The plugin's loader dependency must remain `workspace:^`. pnpm converts it to a published caret range. Do not replace it with a registry dependency when upgrading oxfmt. Both packages require Node.js `^22.13.0 || >=24`.

## Agent-Specific Instructions

When oxfmt options change, update `packages/eslint-plugin-oxfmt/src/schema.ts`, run `pnpm update:rule-options`, and verify `pnpm check:schema`. Preserve virtual-file skips and `useConfig` merge semantics. Changes to the loader must be checked against the plugin after rebuilding.

Release commands commit, tag, push, and trigger npm publishing; use them only when publishing is requested. See the root README for the shared release workflow and npm Trusted Publisher setup.
