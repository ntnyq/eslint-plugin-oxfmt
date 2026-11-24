import { defineConfig } from 'tsdown'

export default defineConfig({
  clean: true,
  dts: true,
  entry: ['src/index.ts'],
  platform: 'node',
  banner:
    '/*! Includes @ntnyq/utils, copyright (c) 2024-PRESENT ntnyq <https://github.com/ntnyq>. MIT License, see LICENSE. */',
  deps: {
    onlyBundle: ['@ntnyq/utils'],
  },
})
