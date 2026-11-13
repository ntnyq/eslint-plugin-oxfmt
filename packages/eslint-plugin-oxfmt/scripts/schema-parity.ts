import type { JSONSchema4 } from 'json-schema'

export interface SchemaDifference {
  actual: NormalizedValue | undefined
  expected: NormalizedValue | undefined
  path: string
}

type NormalizedValue =
  | boolean
  | number
  | string
  | NormalizedValue[]
  | { [key: string]: NormalizedValue }
  | null

/**
 * Metadata and policies intentionally owned by the ESLint adapter.
 * Numeric serialization formats are enforced by oxfmt, not ESLint's validator.
 * The plugin rejects unknown properties even where upstream permits them.
 */
const IGNORED_SCHEMA_KEYS = new Set([
  '$schema',
  'additionalProperties',
  'allowComments',
  'allowTrailingCommas',
  'default',
  'definitions',
  'description',
  'format',
  'markdownDescription',
  'title',
])

/**
 * Compare validation constraints after expanding local references and wrappers.
 * Extra properties describe the adapter's own top-level options.
 */
export function compareSchemas(
  upstream: JSONSchema4,
  plugin: JSONSchema4,
  extraProperties: Record<string, JSONSchema4> = {},
): SchemaDifference[] {
  const expected = normalizeSchema(
    Object.keys(extraProperties).length > 0
      ? {
          ...upstream,
          properties: { ...upstream.properties, ...extraProperties },
        }
      : upstream,
    upstream,
  )
  const actual = normalizeSchema(plugin, plugin)
  const differences: SchemaDifference[] = []
  collectDifferences(expected, actual, '$', differences)
  return differences
}

function areDisjointBranches(branches: NormalizedValue[]): boolean {
  return branches.every((left, index) =>
    branches.slice(index + 1).every(right => {
      if (
        !isRecord(left) ||
        !isRecord(right) ||
        typeof left.type !== 'string' ||
        typeof right.type !== 'string'
      ) {
        return false
      }
      if (left.type !== right.type) {
        return ![left.type, right.type].every(type =>
          ['integer', 'number'].includes(type),
        )
      }
      const leftEnum = left.enum
      const rightEnum = right.enum
      return (
        Array.isArray(leftEnum) &&
        Array.isArray(rightEnum) &&
        leftEnum.every(value => !rightEnum.includes(value))
      )
    }),
  )
}

function collectDifferences(
  expected: NormalizedValue | undefined,
  actual: NormalizedValue | undefined,
  path: string,
  differences: SchemaDifference[],
) {
  if (isRecord(expected) && isRecord(actual)) {
    for (const key of new Set([
      ...Object.keys(expected),
      ...Object.keys(actual),
    ])) {
      collectDifferences(
        expected[key],
        actual[key],
        `${path}.${key}`,
        differences,
      )
    }
  } else if (
    Array.isArray(expected) &&
    Array.isArray(actual) &&
    expected.length === actual.length
  ) {
    expected.forEach((value, index) =>
      collectDifferences(
        value,
        actual[index],
        `${path}[${index}]`,
        differences,
      ),
    )
  } else if (JSON.stringify(expected) !== JSON.stringify(actual)) {
    differences.push({ actual, expected, path })
  }
}

function isRecord(value: unknown): value is Record<string, NormalizedValue> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function normalizeSchema(
  schema: JSONSchema4,
  root: JSONSchema4,
  references = new Set<string>(),
): NormalizedValue {
  if (schema.$ref) {
    if (!schema.$ref.startsWith('#/') || references.has(schema.$ref)) {
      throw new Error(
        `Unsupported or circular schema reference: ${schema.$ref}`,
      )
    }
    let target: unknown = root
    for (const segment of schema.$ref.slice(2).split('/')) {
      const key = segment.replaceAll('~1', '/').replaceAll('~0', '~')
      if (!isRecord(target) || !Object.hasOwn(target, key)) {
        throw new Error(`Unresolved schema reference: ${schema.$ref}`)
      }
      target = target[key]
    }
    if (!isRecord(target)) {
      throw new Error(`Expected an object schema at ${schema.$ref}`)
    }
    const { $ref, ...siblings } = schema
    return normalizeSchema(
      { ...target, ...siblings },
      root,
      new Set([...references, $ref]),
    )
  }

  if (schema.allOf?.length === 1) {
    const { allOf, ...siblings } = schema
    return normalizeSchema({ ...allOf[0], ...siblings }, root, references)
  }

  const normalized: Record<string, NormalizedValue> = {}
  for (const [key, value] of Object.entries(schema).sort(([left], [right]) =>
    left.localeCompare(right),
  )) {
    if (IGNORED_SCHEMA_KEYS.has(key) || value === undefined) {
      continue
    }
    if (key === 'properties' || key === 'patternProperties') {
      normalized[key] = Object.fromEntries(
        Object.entries(value as Record<string, JSONSchema4>)
          .sort(([left], [right]) => left.localeCompare(right))
          .map(([name, property]) => [
            name,
            normalizeSchema(property, root, references),
          ]),
      )
    } else if (key === 'items' || key === 'not') {
      normalized[key] = Array.isArray(value)
        ? value.map(item => normalizeSchema(item, root, references))
        : normalizeSchema(value as JSONSchema4, root, references)
    } else if (['allOf', 'anyOf', 'oneOf'].includes(key)) {
      const branches = (value as JSONSchema4[]).map(branch =>
        normalizeSchema(branch, root, references),
      )
      // Oxfmt uses both spellings for unions with disjoint branches.
      const unionKey =
        key === 'oneOf' && areDisjointBranches(branches) ? 'anyOf' : key
      normalized[unionKey] = sortValues(branches)
    } else if (
      key === 'enum' ||
      key === 'required' ||
      (key === 'type' && Array.isArray(value))
    ) {
      normalized[key] = sortValues(value as NormalizedValue[])
    } else {
      normalized[key] = value as NormalizedValue
    }
  }
  return normalized
}

function sortValues(values: NormalizedValue[]): NormalizedValue[] {
  return [...values].sort((left, right) =>
    JSON.stringify(left).localeCompare(JSON.stringify(right)),
  )
}
