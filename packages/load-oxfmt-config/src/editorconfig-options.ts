import { isBoolean } from '@ntnyq/utils'
import type { SectionBody } from 'editorconfig'
import type { FormatConfig } from 'oxfmt'

/**
 * Oxfmt-compatible options derived from supported `.editorconfig` properties.
 *
 * @see https://oxc.rs/docs/guide/usage/formatter/config.html#editorconfig
 */
export type EditorconfigFormatOptions = Pick<
  FormatConfig,
  | 'endOfLine'
  | 'insertFinalNewline'
  | 'printWidth'
  | 'singleQuote'
  | 'tabWidth'
  | 'useTabs'
>

/**
 * Maps a parsed EditorConfig section to the subset of oxfmt formatter options it supports.
 *
 * @param section - The parsed EditorConfig section body.
 * @param inheritedSection - Global properties inherited by a static override.
 * @returns Formatter options derived from the section.
 */
export function mapEditorconfigSectionToOptions(
  section: SectionBody,
  inheritedSection: SectionBody = {},
): EditorconfigFormatOptions {
  const options: EditorconfigFormatOptions = {}

  const endOfLine = parseEditorconfigEndOfLine(section.end_of_line)

  if (endOfLine) {
    options.endOfLine = endOfLine
  }

  if (section.indent_style === 'tab') {
    options.useTabs = true
  } else if (section.indent_style === 'space') {
    options.useTabs = false
  }

  const singleQuote = parseEditorconfigQuoteType(section.quote_type)

  if (isBoolean(singleQuote)) {
    options.singleQuote = singleQuote
  }

  if (
    section.indent_style !== undefined ||
    section.indent_size !== undefined ||
    section.tab_width !== undefined
  ) {
    // Select the width after inheriting raw properties, before collapsing both
    // indent_size and tab_width into the single oxfmt tabWidth option.
    const effectiveSection = { ...inheritedSection, ...section }
    const tabWidth = parseEditorconfigTabWidth(effectiveSection)

    if (tabWidth !== undefined) {
      options.tabWidth = tabWidth
    }
  }

  const printWidth = parseEditorconfigInteger(section.max_line_length)

  if (printWidth !== undefined) {
    options.printWidth = printWidth
  }

  const insertFinalNewline = parseEditorconfigBoolean(
    section.insert_final_newline,
  )

  if (isBoolean(insertFinalNewline)) {
    options.insertFinalNewline = insertFinalNewline
  }

  return options
}

/**
 * Parses an EditorConfig boolean string.
 *
 * @param value - The raw EditorConfig value.
 * @returns The parsed boolean, or undefined when the value is unsupported.
 */
function parseEditorconfigBoolean(value: string | undefined) {
  if (value === 'true') {
    return true
  }

  if (value === 'false') {
    return false
  }

  return undefined
}

/**
 * Parses the end-of-line style supported by oxfmt.
 *
 * @param value - The raw EditorConfig end_of_line value.
 * @returns The normalized line ending value, or undefined when unsupported.
 */
function parseEditorconfigEndOfLine(value: string | undefined) {
  switch (value) {
    case 'cr':
    case 'crlf':
    case 'lf':
      return value
  }

  return undefined
}

/**
 * Parse unsigned decimal EditorConfig values before formatter range validation.
 */
function parseEditorconfigInteger(value: string | undefined) {
  if (!value || !/^\+?\d+$/u.test(value)) {
    return undefined
  }

  const integer = Number(value)

  return Number.isFinite(integer) ? integer : undefined
}

/**
 * Parses the single quote preference from an EditorConfig section.
 *
 * @param value - The raw EditorConfig value for single quote preference.
 * @returns True if single quotes are preferred, false if double quotes are preferred, or undefined when auto.
 */
function parseEditorconfigQuoteType(value: string | undefined) {
  if (value === 'single') {
    return true
  }

  if (value === 'double') {
    return false
  }

  // auto or undefined
  return undefined
}

/**
 * Resolves the effective tab width from an EditorConfig section.
 *
 * @param section - The parsed EditorConfig section body.
 * @returns The resolved tab width, or undefined when no numeric value is available.
 */
function parseEditorconfigTabWidth(section: SectionBody) {
  const values =
    section.indent_style === 'space'
      ? [section.indent_size, section.tab_width]
      : [section.tab_width, section.indent_size]

  for (const value of values) {
    const parsedWidth = parseEditorconfigInteger(value)

    if (parsedWidth !== undefined) {
      return parsedWidth
    }
  }

  return undefined
}
