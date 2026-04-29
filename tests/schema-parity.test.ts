import { readFile } from 'node:fs/promises'
import { expect, it } from 'vitest'
import { oxfmtRuleSchema } from '../src/schema'
import type { JSONSchema4, JSONSchema4Type } from 'json-schema'

const UPSTREAM_SCHEMA_PATH = 'node_modules/oxfmt/configuration_schema.json'

const PLUGIN_ONLY_TOP_LEVEL_OPTIONS = new Set(['configPath', 'useConfig'])

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

it('should keep top-level schema options aligned with oxfmt + plugin extras', async () => {
  const upstreamRaw = await readFile(UPSTREAM_SCHEMA_PATH, 'utf8')
  const upstreamSchema = JSON.parse(upstreamRaw) as JSONSchema4

  const upstreamKeys = Object.keys(upstreamSchema.properties ?? {}).sort()
  const pluginKeys = Object.keys(oxfmtRuleSchema.properties ?? {}).sort()

  const expectedPluginKeys = [
    ...upstreamKeys,
    ...PLUGIN_ONLY_TOP_LEVEL_OPTIONS,
  ].sort()

  expect(pluginKeys).toEqual(expectedPluginKeys)
})

it('should keep enum options aligned with oxfmt schema', async () => {
  const upstreamRaw = await readFile(UPSTREAM_SCHEMA_PATH, 'utf8')
  const upstreamSchema = JSON.parse(upstreamRaw) as JSONSchema4

  const upstreamProperties = upstreamSchema.properties ?? {}
  const pluginProperties = (oxfmtRuleSchema.properties ?? {}) as Record<
    string,
    JSONSchema4
  >

  for (const key of Object.keys(upstreamProperties)) {
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

    const normalize = (value: JSONSchema4Type[]) => [...value].sort()
    expect(normalize(pluginEnum), `${key} enum drift`).toEqual(
      normalize(upstreamEnum),
    )
  }

  // Explicitly guard the historical drift point.
  const objectWrap = resolveEnum(
    pluginProperties.objectWrap as JSONSchema4,
    {
      definitions: {},
      properties: pluginProperties,
    } as JSONSchema4,
  )

  expect(objectWrap).toEqual(['preserve', 'collapse'])
})
