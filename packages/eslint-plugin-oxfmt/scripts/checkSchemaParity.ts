import { readFile } from 'node:fs/promises'
import process from 'node:process'
import { styleText } from 'node:util'
import { oxfmtRuleSchema, pluginOptionsSchema } from '../src/schema'
import { compareSchemas } from './schema-parity'
import type { JSONSchema4 } from 'json-schema'

const UPSTREAM_SCHEMA_URL = new URL(
  '../node_modules/oxfmt/configuration_schema.json',
  import.meta.url,
)
const LOG_PREFIX = styleText('gray', '[check:schema]')
const upstream = JSON.parse(
  await readFile(UPSTREAM_SCHEMA_URL, 'utf8'),
) as JSONSchema4
const differences = compareSchemas(
  upstream,
  oxfmtRuleSchema,
  pluginOptionsSchema.properties,
)

for (const difference of differences) {
  console.error(
    `${LOG_PREFIX} ${styleText(['bold', 'red'], 'ERROR')} ${difference.path}: expected ${JSON.stringify(difference.expected) ?? '(missing)'}, received ${JSON.stringify(difference.actual) ?? '(missing)'}`,
  )
}
if (differences.length > 0) {
  process.exitCode = 1
} else {
  console.log(
    `${LOG_PREFIX} ${styleText(['bold', 'green'], 'PASS')} Schema parity passed (${Object.keys(upstream.properties ?? {}).length} upstream options checked recursively).`,
  )
}
