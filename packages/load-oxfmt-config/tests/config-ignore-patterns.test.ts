import { describe, expect, it } from 'vitest'
import { loadOxfmtConfig } from '../src'
import { fixturePath } from './helpers'

describe('loadOxfmtConfig', () => {
  describe('ignorePatterns handling', () => {
    it('loads config with ignorePatterns array', async () => {
      const cwd = fixturePath('load', 'ignore-patterns')
      const configPath = '.oxfmtrc.json'

      const result = await loadOxfmtConfig({ configPath, cwd })

      expect(result.config.ignorePatterns).toStrictEqual([
        '*.test.ts',
        'dist/**',
        'node_modules/**',
      ])
      expect(result.config.printWidth).toBe(80)
    })

    it('loads config with empty ignorePatterns array', async () => {
      const cwd = fixturePath('load', 'ignore-empty')
      const configPath = '.oxfmtrc.json'

      const result = await loadOxfmtConfig({ configPath, cwd })

      expect(result.config.ignorePatterns).toStrictEqual([])
      expect(result.config.printWidth).toBe(100)
    })

    it('loads config without ignorePatterns field', async () => {
      const cwd = fixturePath('load', 'no-ignore')
      const configPath = '.oxfmtrc.json'

      const result = await loadOxfmtConfig({ configPath, cwd })

      expect(result.config.ignorePatterns).toBeUndefined()
      expect(result.config.printWidth).toBe(80)
    })

    it('parses ignorePatterns from JSONC config files', async () => {
      const cwd = fixturePath('load', 'jsonc-ignore')
      const configPath = '.oxfmtrc.jsonc'

      const result = await loadOxfmtConfig({ configPath, cwd })

      expect(result.config.ignorePatterns).toStrictEqual(['**/*.test.ts'])
      expect(result.config.semi).toBeTruthy()
    })

    it('loads config with ignorePatterns and overrides together', async () => {
      const cwd = fixturePath('load', 'ignore-overrides')
      const configPath = '.oxfmtrc.json'

      const result = await loadOxfmtConfig({ configPath, cwd })

      expect(result.config.ignorePatterns).toStrictEqual([
        'dist/**',
        'build/**',
      ])
      expect(result.config.overrides).toBeDefined()
      expect(result.config.overrides?.[0]!.files).toStrictEqual(['src/**/*.ts'])
    })
  })
})
