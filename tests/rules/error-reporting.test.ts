import { afterEach, expect, it, vi } from 'vitest'

afterEach(() => {
  vi.resetModules()
  vi.clearAllMocks()
  vi.doUnmock('synckit')
})

it('should include worker error details in the reported lint message', async () => {
  const report = vi.fn()

  vi.doMock('synckit', () => ({
    createSyncFn: () => () => {
      throw new Error('mock worker failure')
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
