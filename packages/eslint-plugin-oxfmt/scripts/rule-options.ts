// The historical subpath accepted strings for custom group selectors/modifiers.
const COMPATIBILITY_DECLARATIONS = `
/**
 * Historical rule options with string-based custom group inputs preserved.
 */
export type OxfmtOxfmt = PreserveLegacyCustomGroupInputs<OxfmtRuleOptionsTuple>

type PreserveLegacyCustomGroupInputs<Options> = Options extends object
  ? {
      [Key in keyof Options]: Key extends 'selector'
        ? string
        : Key extends 'modifiers'
          ? string[]
          : PreserveLegacyCustomGroupInputs<Options[Key]>
    }
  : Options
`

/**
 * Adapt generated declarations while preserving the historical custom-group input types.
 * Reject generator output changes before writing an incomplete public declaration file.
 */
export function createRuleOptionsDeclarations(declarations: string): string {
  const strictDeclarations = replaceDeclarationOnce(
    replaceDeclarationOnce(
      declarations,
      'export interface RuleOptions {',
      'export type RuleOptions = {',
    ),
    'type OxfmtOxfmt =',
    'export type OxfmtRuleOptionsTuple =',
  )
  return `${strictDeclarations}\n${COMPATIBILITY_DECLARATIONS}`.replaceAll(
    /[\t ]+$/gmu,
    '',
  )
}

/**
 * Require a unique declaration anchor so generator drift fails explicitly.
 */
function replaceDeclarationOnce(
  source: string,
  expected: string,
  replacement: string,
): string {
  const count = source.split(expected).length - 1
  if (count !== 1) {
    throw new Error(
      `Expected exactly one declaration anchor ${JSON.stringify(expected)}, found ${count}.`,
    )
  }
  return source.replace(expected, () => replacement)
}
