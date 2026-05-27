---
name: bump-oxfmt
description: Upgrade workflow for this ESLint oxfmt plugin when oxfmt releases a new version. Use when comparing behavior drift between current plugin output and new oxfmt output, then updating implementation, tests, schemas, and docs.
metadata:
  owner: oxfmt-plugin
  version: '2026.05.27'
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
- Access to fixture files under tests/fixtures and tests/files.

## Upgrade Checklist

### 1. Baseline Before Changes

Run a clean baseline to know what changed because of the bump only.

```bash
pnpm install
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
pnpm up oxfmt@<new-version>
pnpm install
```

Then inspect lockfile and package metadata changes.

### 3. Compare Plugin Surface Against Upstream

Audit all places where plugin behavior mirrors oxfmt:

- Option schema and type surfaces.
- Rule runtime option mapping.
- Config loading and merge precedence.
- Worker bridge and formatting invocation.
- Report generation and diff output.

Files to review first:

- src/schema.ts
- src/types.ts
- src/rules/oxfmt.ts
- workers/oxfmt.mjs
- src/reporter.ts

### 4. Apply Required Code Updates

1. Dependency bump in package.json and lockfile.
2. If upstream options changed:
   - Update schema in src/schema.ts.
   - Regenerate option types via:

```bash
pnpm update:rule-options
```

3. If runtime semantics changed:
   - Update rule implementation in src/rules/oxfmt.ts.
   - Update worker bridge in workers/oxfmt.mjs.
   - Preserve virtual-file skip behavior.

4. If config precedence changed upstream:
   - Ensure useConfig semantics remain test-aligned.
   - Keep rule-level overrides merged when useConfig is true unless explicitly changing behavior.

### 5. Update and Expand Tests

Run targeted suites first:

```bash
pnpm test tests/rules/oxfmt.test.ts
pnpm test tests/rules/error-reporting.test.ts
pnpm test tests/configs.test.ts
pnpm test tests/cli-parity.test.ts
pnpm test tests/eslint-plugin.test.ts
pnpm test tests/schema-parity.test.ts
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

- README option tables and examples.
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
- Summary of behavior changes observed.
- Files/snapshots updated and why.
- Backward-compatibility and migration impact.

## Fast Triage Matrix

- Only snapshot diffs changed: verify output intent, then snapshot update.
- Schema parity failed: sync src/schema.ts and regenerate dts.
- Config-loading tests failed: inspect useConfig merge and precedence logic.
- Error-reporting tests failed: inspect reporter output and virtual-file guards.

## Non-Negotiables

- Do not hand-edit dts/rule-options.d.ts.
- Always run pnpm check:schema when option surface changes.
- Keep virtual-file skip behavior intact unless intentionally redesigned.
- Keep preset exports and flat-config ergonomics stable unless documented.
