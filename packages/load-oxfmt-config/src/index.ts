export { isOxfmtIgnored } from './ignore'
export { readConfigFromFile } from './read-config'
export { resolveOxfmtrcPath } from './resolve-config'

// Retain historical exports while keeping new implementation helpers private.
export { getConfigCacheKey, getResolveCacheKey } from './cache'
export { loadOxfmtConfig, loadOxfmtConfigForFile } from './load-config'
export type {
  EditorconfigLoadOptions,
  EditorconfigOption,
  IsOxfmtIgnoredOptions,
  IsOxfmtIgnoredResult,
  LoadOxfmtConfigOptions,
  LoadOxfmtConfigResult,
  OxfmtConfigOverride,
  OxfmtOptions,
} from './types'
