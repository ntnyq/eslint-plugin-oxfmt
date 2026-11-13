import { isBoolean, isNumber } from '@ntnyq/utils'
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
    if (isNumber(tabWidth)) {
      options.tabWidth = tabWidth
    }
  }

  if (section.max_line_length && section.max_line_length !== 'unset') {
    const parsedPrintWidth = Number(section.max_line_length)
    if (Number.isFinite(parsedPrintWidth)) {
      options.printWidth = parsedPrintWidth
    }
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
    if (!value || value === 'unset' || value === 'tab') {
      continue
    }

    const parsedWidth = Number(value)
    if (Number.isFinite(parsedWidth)) {
      return parsedWidth
    }
  }

  return undefined
}
