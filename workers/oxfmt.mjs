// @ts-check

import { loadOxfmtConfig } from 'load-oxfmt-config'
import { format } from 'oxfmt'
import { runAsWorker } from 'synckit'

/**
 * @typedef {import('oxfmt').FormatOptions & {useConfig?: boolean, cwd: string, configPath?: string}} Options
 */

runAsWorker(
  async (
    /**
     * @type {string} filename
     */
    filename,
    /**
     * @type {string} source text
     */
    sourceText,
    /**'
     * @type {Options} format options
     */
    options,
  ) => {
    const { configPath, cwd, useConfig = true, ...formatOptions } = options
    const mergedOptions = {
      ...(useConfig
        ? await loadOxfmtConfig({
            configPath,
            cwd,
          })
        : {}),
      ...formatOptions,
    }

    const formatResult = await format(filename, sourceText, mergedOptions)
    return formatResult
  },
)
