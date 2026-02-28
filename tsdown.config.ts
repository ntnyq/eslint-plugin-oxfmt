import { defineConfig } from 'tsdown'

export default defineConfig({
  clean: true,
  dts: true,
  entry: ['src/index.ts'],
  platform: 'node',
  deps: {
    onlyAllowBundle: ['eslint-parser-plain', 'show-invisibles'],
  },
})
