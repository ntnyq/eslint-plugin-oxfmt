import { readFile } from 'node:fs/promises'
import process from 'node:process'
import { styleText } from 'node:util'
import { oxfmtRuleSchema } from '../src/schema'
import type { JSONSchema4, JSONSchema4Type } from 'json-schema'

const UPSTREAM_SCHEMA_PATH = 'node_modules/oxfmt/configuration_schema.json'

const PLUGIN_ONLY_TOP_LEVEL_OPTIONS = new Set([
  'configPath',
  'disableNestedConfig',
  'ignorePath',
  'respectOxfmtDefaultIgnores',
  'useConfig',
  'withNodeModules',
])
const LOG_PREFIX = styleText('gray', '[check:schema]')

function formatList(values: JSONSchema4Type[]) {
  return values.length ? values.join(', ') : '(none)'
}

function printFailure(message: string) {
  console.error(
    `\n${LOG_PREFIX} ${styleText(['bold', 'red'], 'ERROR')} ${message}`,
  )
}

function printWarn(message: string) {
  console.warn(
    `${LOG_PREFIX} ${styleText(['bold', 'yellow'], 'WARN')} ${message}`,
  )
}

function resolveEnum(
  schema: JSONSchema4,
  root: JSONSchema4,
): JSONSchema4Type[] | null {
  if (Array.isArray(schema.enum)) {
    return schema.enum
  }

  if (typeof schema.$ref === 'string') {
    const match = schema.$ref.match(/^#\/definitions\/(.+)$/)
    if (match) {
      const resolved = root.definitions?.[match[1]]
      return resolved ? resolveEnum(resolved, root) : null
    }
  }

  if (Array.isArray(schema.allOf)) {
    for (const sub of schema.allOf) {
      const resolved = resolveEnum(sub, root)
      if (resolved) {
        return resolved
      }
    }
  }

  if (Array.isArray(schema.oneOf)) {
    for (const sub of schema.oneOf) {
      const resolved = resolveEnum(sub, root)
      if (resolved) {
        return resolved
      }
    }
  }

  if (Array.isArray(schema.anyOf)) {
    for (const sub of schema.anyOf) {
      const resolved = resolveEnum(sub, root)
      if (resolved) {
        return resolved
      }
    }
  }

  return null
}

const upstreamRaw = await readFile(UPSTREAM_SCHEMA_PATH, 'utf8')
const upstreamSchema = JSON.parse(upstreamRaw) as JSONSchema4

printWarn(`Checking parity against ${UPSTREAM_SCHEMA_PATH}...`)

const upstreamProperties = upstreamSchema.properties ?? {}
const pluginProperties = (oxfmtRuleSchema.properties ?? {}) as Record<
  string,
  JSONSchema4
>

const upstreamKeys = Object.keys(upstreamProperties).sort()
const expectedPluginKeys = [
  ...upstreamKeys,
  ...PLUGIN_ONLY_TOP_LEVEL_OPTIONS,
].sort()
const pluginKeys = Object.keys(pluginProperties).sort()

const missingInPlugin = expectedPluginKeys.filter(
  key => !pluginKeys.includes(key),
)
const extraInPlugin = pluginKeys.filter(
  key => !expectedPluginKeys.includes(key),
)

let hasError = false

if (missingInPlugin.length > 0) {
  hasError = true
  printFailure(
    `Missing top-level options in plugin schema: ${formatList(missingInPlugin)}`,
  )
}

if (extraInPlugin.length > 0) {
  hasError = true
  printFailure(
    `Unexpected top-level options in plugin schema: ${formatList(extraInPlugin)}`,
  )
}

for (const key of upstreamKeys) {
  const upstreamEnum = resolveEnum(
    upstreamProperties[key] as JSONSchema4,
    upstreamSchema,
  )
  const pluginEnum = resolveEnum(pluginProperties[key] as JSONSchema4, {
    definitions: {},
    properties: pluginProperties,
  })

  if (!upstreamEnum || !pluginEnum) {
    continue
  }

  const upstreamSet = new Set(upstreamEnum)
  const pluginSet = new Set(pluginEnum)

  const extra = pluginEnum.filter(value => !upstreamSet.has(value))
  const missing = upstreamEnum.filter(value => !pluginSet.has(value))

  if (extra.length > 0 || missing.length > 0) {
    hasError = true
    printFailure(
      `Enum drift detected for "${key}": extra=[${formatList(extra)}], missing=[${formatList(missing)}]`,
    )
  }
}

if (hasError) {
  console.error(
    `\n${LOG_PREFIX} ${styleText(['bold', 'red'], 'FAILED')} Plugin schema is out of sync with ${UPSTREAM_SCHEMA_PATH}.`,
  )
  process.exit(1)
}

console.log(
  `${LOG_PREFIX} ${styleText(['bold', 'green'], 'PASS')} Schema parity passed (${upstreamKeys.length} upstream options checked).`,
)
