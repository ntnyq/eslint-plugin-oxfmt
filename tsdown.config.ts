import { defineConfig } from 'tsdown'

export default defineConfig({
  clean: true,
  dts: true,
  entry: ['src/index.ts'],
  noExternal: ['eslint-parser-plain', 'show-invisibles'],
  platform: 'node',
})
