# Copilot Instructions for eslint-plugin-oxfmt

## Project Overview

An ESLint v9+ plugin that integrates **oxfmt** (a Rust-based code formatter) as an ESLint rule. This bridges the performance of Rust tooling with the ESLint ecosystem, providing auto-fix capabilities through the `oxfmt/oxfmt` rule.

## Architecture

### Core Components

- **[src/rules/oxfmt.ts](../src/rules/oxfmt.ts)** - The main ESLint rule implementation. Uses `synckit` to invoke a worker thread for formatting via `oxfmt` library. Reports differences between original and formatted code using `generate-differences`.
- **[src/configs.ts](../src/configs.ts)** - Exports `recommended` config with `parserPlain` (plain-text parser from `eslint-parser-plain`) and the oxfmt rule enabled by default.
- **[workers/oxfmt.mjs](../workers/oxfmt.mjs)** - Worker thread handler that loads oxfmt config and calls the `oxfmt` npm package's `format()` function. Must support both config file loading (`loadOxfmtConfig`) and inline options.
- **[src/reporter.ts](../src/reporter.ts)** - Difference reporting using `generate-differences` to emit readable messages (Insert/Delete/Replace). Converts text diffs into ESLint rule violations with fixes.

### Key Design Pattern

The plugin uses **worker threads** (synckit) to avoid blocking the main ESLint process during formatting. The worker wraps the native `oxfmt` library, supporting both `.oxfmtrc` config files and inline `FormatOptions`.

### Data Flow

1. ESLint rule receives source code and options
2. Rule calls worker via `createSyncFn()` with filename + source + options
3. Worker loads oxfmt config (if enabled) and merges inline options
4. oxfmt formats and returns result
5. `reportDifferences()` compares original vs formatted, emitting violations with fixes

## Development Workflow

### Setup & Build

```bash
pnpm install           # Install with workspace root
pnpm run build         # Runs: update:rule-options → tsdown
pnpm run dev           # Watch mode
```

### Testing

- Run: `pnpm test` (vitest)
- **Test structure**: [tests/eslint-plugin.test.ts](../tests/eslint-plugin.test.ts) lints fixture files and verifies results
- **Fixtures**: [tests/fixtures/eslint-plugin/](../tests/fixtures/eslint-plugin/) contains sample code to lint

### Code Quality

```bash
pnpm run format        # Format code via oxfmt
pnpm run format:check  # Check formatting without writing
pnpm run lint          # ESLint with recommended config
pnpm run typecheck     # TypeScript validation (tsgo --noEmit)
pnpm run release:check # Full QA: format:check → lint → typecheck → test → build
```

### Pre-commit & Release

- **Husky** + **nano-staged** for pre-commit: runs `eslint --fix` on supported files and `oxfmt` on all files
- Release uses `bumpp` for version bumping
- Must pass `release:check` before publishing

## Critical Conventions & Patterns

### Rule Schema Generation

- [scripts/updateRuleOptions.ts](../scripts/updateRuleOptions.ts) auto-generates TypeScript definitions in [dts/rule-options.d.ts](../dts/rule-options.d.ts)
- **On every change to rule options schema**: Must run `pnpm run update:rule-options` to regenerate types
- Uses `eslint-typegen` to extract options from the ESLint rule schema

### Rule Options Format

The rule accepts `FormatConfig` (from oxfmt) merged with config-loading options (`useConfig`, `cwd`, `configPath`, `ignorePatterns`, `overrides`). See [README.md](../README.md#configuration-options) for the full options reference.

### Worker Thread Boundary

- Worker is separate process—must serialize options properly
- [workers/oxfmt.mjs](../workers/oxfmt.mjs) is **plain JS with JSDoc types** (no TypeScript)—add `@param`/`@returns` type annotations to all functions
- Worker receives: `(filename, sourceText, options?) → FormatResult`
- Module-level caches (`resolvedBaseOptionsCache`, `mergedOptionsCache`, `picomatchCache`) use LRU eviction (`MAX_CACHE_SIZE`). Cache keys are serialized with `stableReplacer` for property-order-independent hashing
- Config-level and rule-level `overrides` are merged (config first, rule-level appended). `ignorePatterns` uses `??` (nullish coalescing) so an explicit empty array from the rule takes precedence over config

### Parser Configuration

Uses `eslint-parser-plain` (re-exported in [src/parser.ts](../src/parser.ts)) to treat code as plain text. This is critical for supporting all file types (JS, TS, JSX, TSX) through oxfmt's multi-language support, not ESLint's built-in parsing.

### Build Output Structure

- **Entry**: [src/index.ts](../src/index.ts) (exports plugin object with `configs`, `meta`, `rules`)
- **tsdown config** bundles to ESM (`.mjs`) with types (`.d.mts`) in `dist/`
- **External packages**: `eslint-parser-plain`, `show-invisibles` NOT bundled
- **Published files**: Only `dist/`, `dts/`, `workers/` directories in npm package

## Integration Points & Dependencies

### External Libraries

- **oxfmt** - Rust formatter (native binding). Called in worker only.
- **load-oxfmt-config** - Loads `.oxfmtrc` or config file
- **generate-differences** - Computes text diffs for reporting
- **show-invisibles** - Makes whitespace changes visible in messages
- **synckit** - Wraps worker calls in sync API for ESLint compatibility
- **eslint-parser-plain** - Plain-text parser (no AST parsing)

### Peer Dependencies

- ESLint `^9.5.0 || ^10.0.0` (flat config only—no legacy `eslintrc` support)
- oxfmt `>=0.42.0`

### Engine Requirements

- Node.js `^20.19.0 || >=22.12.0`
- pnpm `>=10.33.0`

## Debugging Tips

### Common Issues

1. **Snapshot mismatches in tests** - Update snapshots with `vitest -u`.
2. **Worker thread errors** - Check [workers/oxfmt.mjs](../workers/oxfmt.mjs) JSDoc types match actual options passed from rule
3. **Config not loading** - Verify `useConfig`, `cwd`, `configPath` options and that `.oxfmtrc` exists at correct path

### Local Testing

```bash
# Test with actual ESLint on fixture files
pnpm test

# Rebuild + watch during development
pnpm run dev
```
