import { defineConfig } from 'bumpp'

export default defineConfig({
  all: true,
  commit: 'chore: release v%s',
  execute: 'pnpm install --lockfile-only && pnpm release:check',
  noGitCheck: false,
  files: [
    'package.json',
    'packages/eslint-plugin-oxfmt/package.json',
    'packages/load-oxfmt-config/package.json',
  ],
})
