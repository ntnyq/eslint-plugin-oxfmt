---
name: bump-oxfmt
description: Upgrade workflow for this ESLint oxfmt plugin when oxfmt releases a new version. Use when comparing behavior drift between current plugin output and new oxfmt output, then updating implementation, tests, schemas, and docs.
metadata:
  owner: oxfmt-plugin
  version: '2026.09.11'
---

## Goal

Keep this plugin aligned with upstream oxfmt after each release while avoiding regressions in presets, rule behavior, and config loading.

## When To Use

- A new oxfmt version is published.
- Renovate opens an oxfmt bump PR.
- Snapshot tests start failing after dependency updates.
- CLI parity or schema parity drifts from expected behavior.

## Inputs You Need

- Current plugin branch with green baseline tests.
- Target oxfmt version and release notes.
- Access to fixtures under `packages/eslint-plugin-oxfmt/tests/fixtures`, plugin format tests under `packages/eslint-plugin-oxfmt/tests/files`, and loader tests under `packages/load-oxfmt-config/tests`.

## Upgrade Checklist

### 1. Baseline Before Changes

Run a clean baseline to know what changed because of the bump only.

```bash
pnpm install --frozen-lockfile
pnpm build
pnpm test
pnpm check:schema
```

If baseline is not green, fix unrelated failures first.

### 2. Gather Upstream Delta

Collect what changed in oxfmt:

- New/removed options.
- Option default changes.
- Parser/language support changes.
- Ignore or config-resolution behavior changes.
- Output formatting changes likely to affect snapshots.

Suggested commands:

```bash
pnpm up -w oxfmt@<new-version>
pnpm install
```

Then inspect lockfile and package metadata changes.

### 2.5. Changelog Diff Is Required

Before touching source code, compare upstream release notes against the version currently used in this repo.

Required checks:

- Read the latest oxfmt changelog/release notes.
- Diff current-in-repo version -> target version and list concrete behavior deltas.
- Classify each delta as:
  - no plugin impact,
  - tests/snapshots only,
  - schema/type/runtime code update required.

Your PR/work summary must include a clear "Update Points" list:

- dependency changes,
- schema/type/runtime changes,
- test/snapshot changes,
- docs/migration notes.

### 3. Compare Plugin Surface Against Upstream

Audit all places where plugin behavior mirrors oxfmt:

- Option schema and type surfaces.
- Rule runtime option mapping.
- Config loading and merge precedence.
- Worker bridge and formatting invocation.
- Report generation and diff output.

Files to review first:

- packages/eslint-plugin-oxfmt/src/schema.ts
- packages/eslint-plugin-oxfmt/src/types.ts
- packages/eslint-plugin-oxfmt/src/rules/oxfmt.ts
- packages/eslint-plugin-oxfmt/workers/oxfmt.mjs
- packages/eslint-plugin-oxfmt/src/reporter.ts

### 4. Apply Required Code Updates

1. Update root `devDependencies.oxfmt` and the lockfile.
   - Update `peerDependencies.oxfmt` in both package manifests using a `>=` range.
   - Keep the plugin dependency on `load-oxfmt-config` as `workspace:^`.
   - Update loader implementation in `packages/load-oxfmt-config/src/` when upstream config or ignore behavior changes; do not install a registry loader release.
   - Package versions share one release cycle managed by root `bump.config.ts`; dependency maintenance does not itself require publishing.
2. If upstream options changed:
   - Update schema in packages/eslint-plugin-oxfmt/src/schema.ts.
   - Regenerate option types via:

```bash
pnpm update:rule-options
```

3. If runtime semantics changed:
   - Update rule implementation in packages/eslint-plugin-oxfmt/src/rules/oxfmt.ts.
   - Update worker bridge in packages/eslint-plugin-oxfmt/workers/oxfmt.mjs.
   - Preserve virtual-file skip behavior.

4. If config precedence changed upstream:
   - Ensure useConfig semantics remain test-aligned.
   - Keep rule-level overrides merged when useConfig is true unless explicitly changing behavior.

### 5. Update and Expand Tests

Build the workspace, then run targeted suites first:

```bash
pnpm build
pnpm --filter eslint-plugin-oxfmt test tests/rules/oxfmt.test.ts
pnpm --filter eslint-plugin-oxfmt test tests/rules/error-reporting.test.ts
pnpm --filter eslint-plugin-oxfmt test tests/configs.test.ts
pnpm --filter eslint-plugin-oxfmt test tests/cli-parity.test.ts
pnpm --filter eslint-plugin-oxfmt test tests/eslint-plugin.test.ts
pnpm --filter eslint-plugin-oxfmt test tests/schema-parity.test.ts
pnpm --filter load-oxfmt-config test
```

Then run full gate:

```bash
pnpm release:check
```

Test update guidance:

- Refresh snapshots only after confirming new output is expected.
- Add fixture cases for newly supported syntax/options.
- Add regression tests for changed defaults and edge cases.
- Keep parity tests covering ignores, nested configs, and parser presets.

### 6. Update Documentation

Update user-facing docs when behavior or options changed:

- Root README requirements and both package README option tables and examples.
- Preset behavior notes.
- Any migration notes for breaking or user-visible changes.

Document explicitly:

- Minimum required oxfmt version.
- Any option renames/removals.
- Any changed formatting outputs users should expect.

### 7. Final Validation And PR Notes

Before merge:

```bash
pnpm build
pnpm test
pnpm check:schema
pnpm lint
pnpm typecheck
```

PR description should include:

- oxfmt version old -> new.
- Loader implementation changes and their effect on the plugin.
- Summary of behavior changes observed.
- Changelog diff highlights and impact classification.
- Explicit "Update Points" list (deps/code/tests/docs).
- Files/snapshots updated and why.
- Backward-compatibility and migration impact.

## Fast Triage Matrix

- Only snapshot diffs changed: verify output intent, then snapshot update.
- Schema parity failed: sync packages/eslint-plugin-oxfmt/src/schema.ts and regenerate dts.
- Config-loading tests failed: inspect useConfig merge and precedence logic.
- Error-reporting tests failed: inspect reporter output and virtual-file guards.

## Non-Negotiables

- Do not hand-edit packages/eslint-plugin-oxfmt/dts/rule-options.d.ts.
- Always run pnpm check:schema when option surface changes.
- Keep virtual-file skip behavior intact unless intentionally redesigned.
- Keep preset exports and flat-config ergonomics stable unless documented.
- Always review upstream changelog and compare against in-repo version before deciding code changes.
- Keep the loader local via `workspace:^` and verify both packages together with `pnpm release:check`.
- Root formatter commands disable nested config discovery to avoid loading intentionally invalid fixture configs.
