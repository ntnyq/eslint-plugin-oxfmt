/**
 * @copyright {@link https://github.com/antfu/eslint-formatting-reporter}
 */

import { DIFFERENCE, generateDifferences } from 'generate-differences'
import { showInvisibles } from 'show-invisibles'
import type { Rule } from 'eslint'
import type { Difference } from 'generate-differences'

export const messages = {
  [DIFFERENCE.DELETE]: 'Delete `{{ deleteText }}`',
  [DIFFERENCE.INSERT]: 'Insert `{{ insertText }}`',
  [DIFFERENCE.REPLACE]: 'Replace `{{ deleteText }}` with `{{ insertText }}`',
}

export function reportDifferences(
  context: Rule.RuleContext,
  source: string,
  formatted: string,
  offset = 0,
) {
  if (source === formatted) {
    return
  }

  const differences = generateDifferences(source, formatted)

  for (const difference of differences) {
    _reportDifference(context, difference, offset)
  }
}

function _reportDifference(
  context: Rule.RuleContext,
  difference: Difference,
  rangeOffset = 0,
) {
  const { offset, operation } = difference
  let deleteText = ''
  let insertText = ''

  if ('deleteText' in difference && difference.deleteText) {
    deleteText = difference.deleteText
  }

  if ('insertText' in difference && difference.insertText) {
    insertText = difference.insertText
  }

  const range = [
    offset + rangeOffset,
    offset + rangeOffset + deleteText.length,
  ] as [number, number]
  const [start, end] = range.map(index =>
    context.sourceCode.getLocFromIndex(index),
  )

  context.report({
    loc: { end, start },
    messageId: operation,
    data: {
      deleteText: showInvisibles(deleteText),
      insertText: showInvisibles(insertText),
    },
    fix: fixer => fixer.replaceTextRange(range, insertText),
  })
}
