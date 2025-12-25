// @ts-check

import { loadOxfmtConfig } from 'load-oxfmt-config'
import { format } from 'oxfmt'
import { runAsWorker } from 'synckit'

/**
 * @typedef {object} PluginOptions
 * @property {boolean} [useConfig] - Whether to use oxfmt configuration file
 * @property {string} cwd - Current working directory for resolving configuration
 * @property {string} [configPath] - Custom path to oxfmt configuration file
 */

/**
 * @typedef {import('oxfmt').FormatOptions & PluginOptions} Options
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
