// @ts-check

import { expect, it } from 'vitest'
import { pluginOptionsSchema } from '../src/schema'
import { splitOptions, WORKER_CONTROL_KEYS } from '../workers/options.mjs'

it('keeps worker controls aligned with the plugin schema, adding only ESLint cwd', () => {
  expect([...WORKER_CONTROL_KEYS].sort()).toEqual(
    [...Object.keys(pluginOptionsSchema.properties), 'cwd'].sort(),
  )
  const options = Object.fromEntries(
    WORKER_CONTROL_KEYS.map(key => [key, undefined]),
  )
  const split = splitOptions({ ...options, ignorePatterns: [], semi: false })

  expect(Object.keys(split.controlOptions).sort()).toEqual(
    [...WORKER_CONTROL_KEYS].sort(),
  )
  expect(split.oxfmtOptions).toEqual({ ignorePatterns: [], semi: false })
})
