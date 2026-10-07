// Email business name — the clean, natural business name interpolated into
// campaign subject lines and bodies. Separate from the CRM `company` field,
// which is never altered.
//
// `deriveEmailBusinessName` proposes a value from the stored company name using
// CONSERVATIVE cleanup only — it strips clear legal suffixes, research notes and
// non-brand bracketed parent-group notes, but never guesses at shortening a real
// name (e.g. it will NOT turn "Autex Industries" into "Autex" — that's a
// judgment call left to a human in the review panel). Low-confidence cases are
// left close to the original so a person can trim them.

/** Legal-suffix tokens stripped from the end of a name (case-insensitive). */
const LEGAL_SUFFIXES = [
  'nz limited', 'new zealand limited', 'limited', 'ltd', 'ltd.',
  'pty ltd', 'llc', 'inc', 'inc.', 'incorporated',
  'co', 'co.', 'company',
]

/** Research-note / verification words — if present, that fragment is dropped. */
const RESEARCH_NOTE = /\b(CONFIRMED|UNCONFIRMED|VERIFY|VERIFIED|note[:s]?|likely|inferred|per LinkedIn|not the|check before|confirm before)\b/i

/** Trim, collapse internal whitespace, tidy stray separators. */
function tidy(s: string): string {
  return s
    .replace(/\s+/g, ' ')
    .replace(/\s*[,;:–—-]\s*$/, '') // trailing separators
    .replace(/^\s*[,;:–—-]\s*/, '') // leading separators
    .trim()
}

export interface EmailNameProposal {
  /** The proposed clean name. */
  value: string
  /** True when we changed nothing meaningful / are unsure — worth a human glance. */
  lowConfidence: boolean
  /** Human-readable note on what was (or wasn't) done. */
  note: string
}

/**
 * Propose an Email business name from a stored company name. Conservative:
 * strips suffixes / notes / non-brand bracketed groups, preserves real brand
 * punctuation, and does NOT shorten on low confidence.
 */
export function deriveEmailBusinessName(rawCompany: string | null | undefined): EmailNameProposal {
  const original = (rawCompany ?? '').trim()
  if (!original) {
    return { value: '', lowConfidence: true, note: 'Company name is blank — enter an email business name.' }
  }

  let value = original
  const changes: string[] = []

  // 1. Drop a trailing research note after a dash/comma
  //    (e.g. "Acme — CONFIRMED as Director" → "Acme").
  if (RESEARCH_NOTE.test(value)) {
    const cut = value.replace(/\s*[—–-]\s*[^—–-]*$/, '') // drop last dash-clause
    if (cut && cut.length < value.length && !RESEARCH_NOTE.test(cut)) {
      value = cut
      changes.push('removed a research note')
    } else {
      // Note is entangled in the name — leave it for a human, flag low-confidence.
      return { value: tidy(value), lowConfidence: true, note: 'Contains a research note that could not be safely removed — please edit.' }
    }
  }

  // 2. Remove bracketed group / acronym notes: "(Bayleys group)", "(AIS)",
  //    "(Bayleys)". These are parenthetical context, not brand — drop them.
  //    A bracket that IS the brand (rare) would need a human; brackets are
  //    almost always notes here.
  const withoutBrackets = value.replace(/\s*[([][^)\]]*[)\]]\s*/g, ' ')
  if (withoutBrackets.trim() && withoutBrackets.trim() !== value.trim()) {
    value = withoutBrackets
    changes.push('removed a bracketed note')
  }

  // 3. Strip a trailing legal suffix (possibly comma-separated), e.g.
  //    "Acme City-Living Management Ltd" → "...Management".
  const suffixPattern = new RegExp(
    `[,]?\\s+(?:${LEGAL_SUFFIXES.map((s) => s.replace(/[.]/g, '\\.')).join('|')})\\s*$`,
    'i',
  )
  const withoutSuffix = value.replace(suffixPattern, '')
  if (withoutSuffix.trim() && withoutSuffix.trim() !== value.trim()) {
    value = withoutSuffix
    changes.push('removed a legal suffix')
  }

  value = tidy(value)

  // If nothing changed, it's just the original — fine, but still worth a glance
  // if the original looked complex (long / had odd punctuation).
  if (changes.length === 0) {
    const complex = value.length > 40 || /[|<>/=]/.test(value)
    return { value, lowConfidence: complex, note: complex ? 'No safe cleanup applied — please check.' : 'Already clean.' }
  }

  return { value, lowConfidence: false, note: changes.join('; ') + '.' }
}
