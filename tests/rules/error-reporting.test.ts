import { afterEach, expect, it, vi } from 'vitest'

afterEach(() => {
  vi.resetModules()
  vi.clearAllMocks()
  vi.doUnmock('synckit')
})

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
