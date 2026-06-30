# Repository Guidelines

## Project Structure & Module Organization

This package is an ESLint flat-config plugin that formats files through `oxfmt`.
Core source lives in `src/`: plugin exports in `src/index.ts`, presets in
`src/configs.ts`, the rule in `src/rules/oxfmt.ts`, schema definitions in
`src/schema.ts`, and reporting helpers in `src/reporter.ts`. Worker-side
formatting and config loading live in `workers/oxfmt.mjs`. Tests are under
`tests/`, with rule tests in `tests/rules/`, file-format fixtures in
`tests/files/`, and integration/config fixtures in `tests/fixtures/`.
Generated rule option types live in `dts/rule-options.d.ts`; do not hand-edit
that file.

## Build, Test, and Development Commands

- `pnpm install`: install dependencies using the pinned pnpm workspace setup.
- `pnpm dev`: run `tsdown` in watch mode for local development.
- `pnpm build`: regenerate rule option types, then build `dist/`.
- `pnpm test`: run the Vitest suite.
- `pnpm lint`: run ESLint.
- `pnpm typecheck`: run `tsgo --noEmit`.
- `pnpm check:schema`: verify plugin option schema parity with upstream oxfmt.
- `pnpm release:check`: full gate: schema, format, lint, typecheck, tests, build.

## Coding Style & Naming Conventions

Use TypeScript ESM in `src/` and plain ESM JavaScript in `workers/`. Formatting
is enforced by `oxfmt`: two spaces, LF line endings, no semicolons, single
quotes for JS/TS, and trailing commas. Keep public exports and preset names
stable (`recommended`, `recommendedWithoutParser`, `cliParity`). Prefer clear
camelCase option names matching upstream oxfmt and `load-oxfmt-config`.

## Testing Guidelines

Tests use Vitest. Add targeted tests near the changed behavior: rule behavior in
`tests/rules/`, config loading in `tests/eslint-plugin.test.ts`, CLI parity in
`tests/cli-parity.test.ts`, and schema checks in `tests/schema-parity.test.ts`.
For formatter output changes, update snapshots only after confirming the new
upstream oxfmt output is intentional. Run targeted tests first, then
`pnpm release:check` before finalizing.

## Commit & Pull Request Guidelines

Use Conventional Commits seen in history, such as `feat: require oxfmt v0.57.0`,
`fix: align override option schema`, `docs: add bump oxfmt skill`, or
`chore: release v0.11.0`. Pull requests should describe behavior changes,
dependency bumps, tests run, and any schema or snapshot updates. Link related
issues when available.

## Agent-Specific Instructions

When oxfmt options change, update `src/schema.ts`, run
`pnpm update:rule-options`, and verify with `pnpm check:schema`. Preserve
virtual-file skip behavior in the rule and keep `useConfig` merge semantics
aligned with existing integration tests.
