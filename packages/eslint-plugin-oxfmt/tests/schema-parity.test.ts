import { readFile } from 'node:fs/promises'
import { expect, it } from 'vitest'
import { compareSchemas } from '../scripts/schema-parity'
import { oxfmtRuleSchema, pluginOptionsSchema } from '../src/schema'
import type { JSONSchema4 } from 'json-schema'

const upstream = JSON.parse(
  await readFile(
    new URL('../node_modules/oxfmt/configuration_schema.json', import.meta.url),
    'utf8',
  ),
) as JSONSchema4

it('keeps the full rule schema aligned with upstream and plugin controls', () => {
  expect(
    compareSchemas(upstream, oxfmtRuleSchema, pluginOptionsSchema.properties),
  ).toEqual([])
})

it.each([
  [
    'missing enum',
    (schema: JSONSchema4) => {
      delete schema.properties?.objectWrap.enum
    },
  ],
  [
    'changed nested type',
    (schema: JSONSchema4) => {
      const association = schema.properties?.associations.items as JSONSchema4
      if (association.properties?.files.items) {
        ;(association.properties.files.items as JSONSchema4).type = 'number'
      }
    },
  ],
  [
    'missing required field',
    (schema: JSONSchema4) => {
      const association = schema.properties?.associations.items as JSONSchema4
      association.required = ['files']
    },
  ],
  [
    'changed numeric bound',
    (schema: JSONSchema4) => {
      if (schema.properties?.printWidth) {
        schema.properties.printWidth.minimum = 1
      }
    },
  ],
  [
    'missing option',
    (schema: JSONSchema4) => {
      delete schema.properties?.semi
    },
  ],
  [
    'extra option',
    (schema: JSONSchema4) => {
      if (schema.properties) {
        schema.properties.unexpected = { type: 'boolean' }
      }
    },
  ],
] satisfies [string, (schema: JSONSchema4) => void][])(
  'detects %s',
  (_name, mutate) => {
    const schema = structuredClone(oxfmtRuleSchema)
    mutate(schema)
    expect(
      compareSchemas(upstream, schema, pluginOptionsSchema.properties).length,
    ).toBeGreaterThan(0)
  },
)

it('normalizes reference wrappers and branch ordering without ignoring validation', () => {
  const expected: JSONSchema4 = {
    allOf: [{ $ref: '#/definitions/Mode' }],
    definitions: { Mode: { enum: ['a', 'b'], type: 'string' } },
  }
  expect(
    compareSchemas(expected, {
      description: 'Adapter wording',
      enum: ['b', 'a'],
      type: 'string',
    }),
  ).toEqual([])
  const branches: JSONSchema4[] = [
    { type: 'boolean' },
    { properties: { enabled: { type: 'boolean' } }, type: 'object' },
  ]
  expect(
    compareSchemas({ anyOf: branches }, { oneOf: [...branches].reverse() }),
  ).toEqual([])
  expect(
    compareSchemas(
      { anyOf: [{ type: 'number' }, { type: 'integer' }] },
      { oneOf: [{ type: 'number' }, { type: 'integer' }] },
    ),
  ).not.toEqual([])
})

it.each(['#/definitions/missing', 'https://example.test/schema.json'])(
  'fails on unresolved or unsupported references: %s',
  $ref => {
    expect(() => compareSchemas({ $ref }, {})).toThrow(/reference/)
  },
)
