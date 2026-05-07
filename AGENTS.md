# AGENTS

Guidance for AI coding agents working in this repository.

## Project Snapshot

- Package: ESLint flat-config plugin that formats files through oxfmt.
- Runtime requirements: ESLint >= 9, Node ^20.19.0 or >=22.12.0.
- Package manager: pnpm.

See: [README.md](README.md)

## Commands To Use

- Install: `pnpm install`
- Build: `pnpm build`
- Test: `pnpm test`
- Lint: `pnpm lint`
- Typecheck: `pnpm typecheck`
- Schema parity check: `pnpm check:schema`
- Regenerate rule option types: `pnpm update:rule-options`
- Full release gate: `pnpm release:check`

Source of truth: [package.json](package.json)

## High-Signal Constraints

- Keep changes aligned with flat-config usage and exported presets in [src/configs.ts](src/configs.ts).
- Do not hand-edit generated types in [dts/rule-options.d.ts](dts/rule-options.d.ts); regenerate via `pnpm update:rule-options`.
- If schema or option enums change, update [src/schema.ts](src/schema.ts) and run `pnpm check:schema` (script: [scripts/checkSchemaParity.ts](scripts/checkSchemaParity.ts)).
- Preserve virtual-file skip behavior in rule execution (processor-extracted files) covered by [tests/rules/error-reporting.test.ts](tests/rules/error-reporting.test.ts).
- Keep config-loading semantics test-aligned, especially when `useConfig` is true (rule-level overrides are still merged), covered by [tests/eslint-plugin.test.ts](tests/eslint-plugin.test.ts).

## Architecture Map

- Plugin entry and exports: [src/index.ts](src/index.ts)
- ESLint presets (`recommended`, `recommendedWithoutParser`, `cliParity`): [src/configs.ts](src/configs.ts)
- Core rule implementation: [src/rules/oxfmt.ts](src/rules/oxfmt.ts)
- Worker bridge and formatting execution: [workers/oxfmt.mjs](workers/oxfmt.mjs)
- Diff/report generation: [src/reporter.ts](src/reporter.ts)
- Rule/config types: [src/types.ts](src/types.ts)

## Testing Strategy For Changes

- Prefer targeted test runs first, then full suite before finalizing.
- For preset or config behavior changes: run [tests/configs.test.ts](tests/configs.test.ts), [tests/cli-parity.test.ts](tests/cli-parity.test.ts), and [tests/eslint-plugin.test.ts](tests/eslint-plugin.test.ts).
- For formatter/rule behavior changes: run [tests/rules/oxfmt.test.ts](tests/rules/oxfmt.test.ts) and [tests/rules/error-reporting.test.ts](tests/rules/error-reporting.test.ts).
- For schema-related changes: run [tests/schema-parity.test.ts](tests/schema-parity.test.ts) and `pnpm check:schema`.

## Link-First Docs

- User-facing usage and options: [README.md](README.md)
- Build and release scripts: [package.json](package.json)
- Type generation implementation: [scripts/updateRuleOptions.ts](scripts/updateRuleOptions.ts)
