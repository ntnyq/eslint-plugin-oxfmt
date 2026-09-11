import { configs } from './configs'
import { meta } from './meta'
import { rules } from './rules'
import type { PluginOxfmt } from './types'

export const plugin: PluginOxfmt = {
  configs,
  meta,
  rules,
}

export * from './meta'
export * from './rules'
export * from './parser'
export * from './configs'

export default plugin
