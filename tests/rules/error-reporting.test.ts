import { ESLint } from 'eslint'
import { afterEach, expect, it, vi } from 'vitest'
import { resolve } from '../../scripts/utils'

afterEach(() => {
  vi.resetModules()
  vi.clearAllMocks()
  vi.doUnmock('synckit')
})

it.each([
  { column: 15, endColumn: 16, line: 1, source: 'const value = ;' },
  { column: 14, endColumn: 15, line: 1, source: 'const éééé = ;' },
  { column: 12, endColumn: 13, line: 1, source: 'const 中文 = ;' },
  { column: 25, endColumn: 26, line: 1, source: 'const a="😀"; const b = ;' },
  { column: 15, endColumn: 16, line: 2, source: '// 中文😀\nconst value = ;' },
  { column: 11, endColumn: 11, line: 1, source: 'const 中文 =' },
])(
  'should report UTF-16 diagnostic locations for $source',
  async ({ column, endColumn, line, source }) => {
    const { default: pluginOxfmt } = await import('../../src')
    const cwd = resolve('tests/fixtures/base')
    const eslint = new ESLint({
      cwd,
      overrideConfigFile: true,
      overrideConfig: [
        {
          ...pluginOxfmt.configs.recommended,
          rules: {
            'oxfmt/oxfmt': ['error', { useConfig: false }],
          },
        },
      ],
    })
    const [result] = await eslint.lintText(source, {
      filePath: resolve(cwd, 'diagnostic.js'),
    })

    expect(result.messages).toEqual([
      expect.objectContaining({
        column,
        endColumn,
        endLine: line,
        line,
        message: 'Failed to format code: Unexpected token',
        ruleId: 'oxfmt/oxfmt',
      }),
    ])
  },
)

it('should include worker error details in the reported lint message', async () => {
  const report = vi.fn()

  vi.doMock('synckit', () => ({
    createSyncFn() {
      return () => {
        throw new Error('mock worker failure')
      }
    },
  }))

  const { oxfmt } = await import('../../src/rules/oxfmt')

  const listeners = oxfmt.create({
    cwd: '/repo',
    filename: '/repo/src/example.js',
    options: [{ useConfig: false }],
    physicalFilename: '/repo/src/example.js',
    report,
    sourceCode: {
      ast: { type: 'Program' },
      text: 'const value = 1;',
    },
  } as never)

  listeners.Program?.({ type: 'Program' } as never)

  expect(report).toHaveBeenCalledTimes(1)
  expect(report).toHaveBeenCalledWith(
    expect.objectContaining({
      message:
        'Failed to format file: /repo/src/example.js: mock worker failure',
    }),
  )
})

it('should skip processor-extracted virtual files', async () => {
  const report = vi.fn()
  const createSyncFn = vi.fn(() => () => ({ code: 'const value = 1;' }))

  vi.doMock('synckit', () => ({
    createSyncFn,
  }))

  const { oxfmt } = await import('../../src/rules/oxfmt')

  const listeners = oxfmt.create({
    cwd: '/repo',
    filename: '/repo/src/example.js/0_0.inline-template-1.html',
    options: [{ useConfig: false }],
    physicalFilename: '/repo/src/example.js',
    report,
    sourceCode: {
      ast: { type: 'Program' },
      text: '<div>{{ value }}</div>',
    },
  } as never)

  expect(listeners).toEqual({})
  expect(createSyncFn).not.toHaveBeenCalled()
  expect(report).not.toHaveBeenCalled()
})

it('should report formatter diagnostics using label ranges when available', async () => {
  const report = vi.fn()

  vi.doMock('synckit', () => ({
    createSyncFn() {
      return () => ({
        code: 'const value = 1;',
        errors: [
          {
            labels: [{ end: 11, start: 6 }],
            message: 'labelled formatter error',
          },
        ],
      })
    },
  }))

  const { oxfmt } = await import('../../src/rules/oxfmt')

  const listeners = oxfmt.create({
    cwd: '/repo',
    filename: '/repo/src/example.js',
    options: [{ useConfig: false }],
    physicalFilename: '/repo/src/example.js',
    report,
    sourceCode: {
      ast: { type: 'Program' },
      text: 'const value = 1;',
      getLocFromIndex(index: number) {
        return { column: index, line: 1 }
      },
    },
  } as never)

  listeners.Program?.({ type: 'Program' } as never)

  expect(report).toHaveBeenCalledWith(
    expect.objectContaining({
      message: 'Failed to format code: labelled formatter error',
      loc: {
        end: { column: 11, line: 1 },
        start: { column: 6, line: 1 },
      },
    }),
  )
})

it('should report formatter diagnostics at fallback location when labels are missing', async () => {
  const report = vi.fn()

  vi.doMock('synckit', () => ({
    createSyncFn() {
      return () => ({
        code: 'const value = 1;',
        errors: [
          {
            message: 'unlabelled formatter error',
          },
        ],
      })
    },
  }))

  const { oxfmt } = await import('../../src/rules/oxfmt')

  const listeners = oxfmt.create({
    cwd: '/repo',
    filename: '/repo/src/example.js',
    options: [{ useConfig: false }],
    physicalFilename: '/repo/src/example.js',
    report,
    sourceCode: {
      ast: { type: 'Program' },
      text: 'const value = 1;',
    },
  } as never)

  listeners.Program?.({ type: 'Program' } as never)

  expect(report).toHaveBeenCalledWith(
    expect.objectContaining({
      message: 'Failed to format code: unlabelled formatter error',
      loc: {
        end: { column: 0, line: 1 },
        start: { column: 0, line: 1 },
      },
    }),
  )
})
