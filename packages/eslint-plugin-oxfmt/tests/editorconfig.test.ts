import { expect, it } from 'vitest'
import { mapFixtureSummaryByFile, runFixture } from './helpers/fixtures'
import { resolvePackagePath } from './helpers/paths'

const EDITORCONFIG_QUOTE_TYPE_ROOT_CASES = [
  {
    expectedOutput: `export const message = 'hello world';`,
    cwd: resolvePackagePath(
      'tests/fixtures/config-loading/editorconfig-quote-type-root-auto',
    ),
    title:
      'should treat root .editorconfig quote_type=auto as a supported no-op fallback',
  },
  {
    expectedOutput: `export const message = "hello world";`,
    title: 'should map root .editorconfig quote_type=double to double quotes',
    cwd: resolvePackagePath(
      'tests/fixtures/config-loading/editorconfig-quote-type-root-double',
    ),
  },
  {
    expectedOutput: `export const message = 'hello world';`,
    title: 'should map root .editorconfig quote_type=single to single quotes',
    cwd: resolvePackagePath(
      'tests/fixtures/config-loading/editorconfig-quote-type-root-single',
    ),
  },
] as const

EDITORCONFIG_QUOTE_TYPE_ROOT_CASES.forEach(
  ({
    cwd,
    expectedOutput,
    title,
  }: (typeof EDITORCONFIG_QUOTE_TYPE_ROOT_CASES)[number]) => {
    it(`${title}`, async () => {
      const summary = await runFixture(cwd)

      expect(summary).toHaveLength(1)
      expect(summary[0]?.messages.length).toBeGreaterThan(0)
      expect(summary[0]?.output).toBe(expectedOutput)
    })
  },
)

it('should keep root oxfmt options above section .editorconfig fallbacks', async () => {
  const summary = await runFixture(
    resolvePackagePath(
      'tests/fixtures/config-loading/editorconfig-quote-type-sections',
    ),
  )
  const summaryByFile = mapFixtureSummaryByFile(summary)

  expect(summaryByFile.get('src/single.js')?.output).toBe(
    `export const message = 'hello world';`,
  )
  expect(summaryByFile.get('src/double.js')?.output).toBe(
    `export const message = 'hello world';`,
  )
  expect(summaryByFile.get('src/auto.js')?.output).toBe(
    `export const message = 'hello world';`,
  )

  expect(summaryByFile.get('src/single.js')?.messages.length).toBeGreaterThan(0)
  expect(summaryByFile.get('src/double.js')?.messages.length).toBeGreaterThan(0)
  expect(summaryByFile.get('src/auto.js')?.messages.length).toBeGreaterThan(0)
})

it('should keep root oxfmt options above .editorconfig [**] fallbacks', async () => {
  const summary = await runFixture(
    resolvePackagePath(
      'tests/fixtures/config-loading/editorconfig-double-star',
    ),
  )

  expect(summary).toHaveLength(1)
  expect(summary[0]?.messages).toHaveLength(0)
})

it('should apply section indent_size without repeating the root indent_style', async () => {
  const summary = await runFixture(
    resolvePackagePath('tests/fixtures/config-loading/editorconfig-sections'),
  )
  const summaryByFile = mapFixtureSummaryByFile(summary)

  expect(summaryByFile.get('src/sectioned.js')?.output)
    .toBe(`export function buildUser(
     name,
) {
     return createUserProfile(
          name,
          'a very long display name',
     );
}`)
})
