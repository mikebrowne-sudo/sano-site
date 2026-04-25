// Phase H — template renderer.
//
// Pure: takes a template string with {{placeholder}} tokens and a
// variables map, returns a fully-rendered string. Unknown
// placeholders are kept verbatim so the operator can spot typos
// during preview / test sends. Whitespace is collapsed at the
// edges and inside double newlines (SMS-safe).

export type TemplateVariables = Record<string, string | number | null | undefined>

const PLACEHOLDER_RE = /{{\s*([a-zA-Z0-9_]+)\s*}}/g

export interface RenderResult {
  body: string
  unknownPlaceholders: string[]
  charCount: number
  /** SMS warning when the rendered body exceeds the GSM-7 single-
   *  segment limit (160 chars). Doesn't block — the sender just
   *  pays for two segments. */
  exceedsSmsSingleSegment: boolean
}

export function renderTemplate(template: string, vars: TemplateVariables): RenderResult {
  if (!template) {
    return { body: '', unknownPlaceholders: [], charCount: 0, exceedsSmsSingleSegment: false }
  }

  const unknown: string[] = []
  const replaced = template.replace(PLACEHOLDER_RE, (match, name: string) => {
    if (Object.prototype.hasOwnProperty.call(vars, name)) {
      const v = vars[name]
      return v == null ? '' : String(v)
    }
    unknown.push(name)
    return match
  })

  // Trim + collapse triple+ newlines down to double for SMS sanity.
  const cleaned = replaced
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()

  return {
    body: cleaned,
    unknownPlaceholders: Array.from(new Set(unknown)),
    charCount: cleaned.length,
    exceedsSmsSingleSegment: cleaned.length > 160,
  }
}
