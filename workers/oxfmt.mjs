// @ts-check

import { format } from 'oxfmt'
import { runAsWorker } from 'synckit'

/**
 * @import { FormatOptions } from 'oxfmt'
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
     * @type {FormatOptions} format options
     */
    options,
  ) => {
    const formatResult = await format(filename, sourceText, options)
    return formatResult
  },
)
