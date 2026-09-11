import assert from 'node:assert/strict'
import process from 'node:process'
import root from '../package.json'
import plugin from '../packages/eslint-plugin-oxfmt/package.json'
import loader from '../packages/load-oxfmt-config/package.json'

for (const pkg of [loader, plugin]) {
  assert.equal(
    pkg.version,
    root.version,
    `${pkg.name} must use the root version`,
  )
}

const tag = process.argv[2]
if (tag) {
  assert.equal(
    tag,
    `v${root.version}`,
    'Release tag must match package versions',
  )
}

console.info(`Package versions are aligned at ${root.version}`)
