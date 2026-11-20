import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import process from 'node:process'
import root from '../package.json'
import plugin from '../packages/eslint-plugin-oxfmt/package.json'
import loader from '../packages/load-oxfmt-config/package.json'

const require = createRequire(import.meta.url)
const rootDir = resolve(import.meta.dirname, '..')
const pnpm = process.env.npm_execpath ?? 'pnpm'
const pnpmIsScript = /\.[cm]?js$/u.test(pnpm)

function runPnpm(args: string[], cwd: string) {
  execFileSync(
    pnpmIsScript ? process.execPath : pnpm,
    pnpmIsScript ? [pnpm, ...args] : args,
    { cwd, stdio: 'inherit' },
  )
}

const eslintVersion = /^\^(\d+\.\d+\.\d+)(?:\s|$)/u.exec(
  plugin.peerDependencies.eslint,
)?.[1]
const oxfmtVersion = /^>=(\d+\.\d+\.\d+)$/u.exec(
  plugin.peerDependencies.oxfmt,
)?.[1]

assert.ok(
  eslintVersion && oxfmtVersion,
  'Expected explicit minimum peer versions',
)

const cwd = mkdtempSync(join(tmpdir(), 'oxfmt-package-smoke-'))

try {
  for (const pkg of [loader, plugin]) {
    runPnpm(['--filter', pkg.name, 'pack', '--pack-destination', cwd], rootDir)
  }

  const loaderTarball = `file:./${loader.name}-${loader.version}.tgz`

  writeFileSync(
    join(cwd, 'package.json'),
    JSON.stringify({
      // ESLint 9.5 does not ship its own TypeScript declarations.
      devDependencies: { '@types/eslint': '9.6.1' },
      packageManager: root.packageManager,
      private: true,
      type: 'module',
      dependencies: {
        eslint: eslintVersion,
        [loader.name]: loaderTarball,
        oxfmt: oxfmtVersion,
        [plugin.name]: `file:./${plugin.name}-${plugin.version}.tgz`,
      },
    }),
  )

  // Resolve the plugin's registry range to the tarball built in this run.
  writeFileSync(
    join(cwd, 'pnpm-workspace.yaml'),
    `overrides:\n  "${plugin.name}>${loader.name}": "${loaderTarball}"\n`,
  )
  runPnpm(['install', '--no-frozen-lockfile'], cwd)

  const consumerRequire = createRequire(join(cwd, 'package.json'))
  const packedManifest: typeof plugin = consumerRequire(
    `${plugin.name}/package.json`,
  )
  const pluginRequire = createRequire(consumerRequire.resolve(plugin.name))

  assert.equal(
    packedManifest.dependencies['load-oxfmt-config'],
    `^${loader.version}`,
  )
  assert.equal(
    pluginRequire.resolve(loader.name),
    consumerRequire.resolve(loader.name),
  )

  writeFileSync(
    join(cwd, 'eslint.config.mjs'),
    `import { cliParity } from 'eslint-plugin-oxfmt'\nexport default [cliParity]\n`,
  )
  writeFileSync(join(cwd, '.oxfmtrc.json'), '{"singleQuote":true}\n')
  writeFileSync(join(cwd, 'example.js'), 'export const value="hello"\n')
  runPnpm(['exec', 'eslint', '--fix', 'example.js'], cwd)
  assert.equal(
    readFileSync(join(cwd, 'example.js'), 'utf8'),
    "export const value = 'hello';\n",
  )

  writeFileSync(
    join(cwd, 'consumer.ts'),
    `import { cliParity, type OxfmtRuleOptions } from 'eslint-plugin-oxfmt'
import type { OxfmtRuleOptionsTuple } from 'eslint-plugin-oxfmt/rule-options'
import { loadOxfmtConfig, type OxfmtOptions } from 'load-oxfmt-config'

export const configs = [cliParity]
const options: OxfmtRuleOptions = { singleQuote: true }
export const ruleOptions: OxfmtRuleOptionsTuple = [options]
export const config: OxfmtOptions = (await loadOxfmtConfig()).config
`,
  )
  execFileSync(
    process.execPath,
    [
      require.resolve('typescript/bin/tsc'),
      '--module',
      'NodeNext',
      '--strict',
      '--noEmit',
      'consumer.ts',
    ],
    { cwd, stdio: 'inherit' },
  )

  console.info(
    `Package smoke passed with ESLint ${eslintVersion} and oxfmt ${oxfmtVersion}`,
  )
} finally {
  rmSync(cwd, { force: true, recursive: true })
}
