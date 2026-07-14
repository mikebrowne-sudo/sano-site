// Map a bank-statement payee to portal client(s) so we can scope which
// invoices a reference-less payment might cover. Property managers pay under
// names like "B&T Onehunga" / "WOLFBROOK PROPERTY M" / "WENDELL PROPERTY MAN",
// which need a little normalising to line up with client names such as
// "Barfoot & Thompson - Onehunga", "Wolfbrook Property", "Wendell Property".

// Bank transaction-type prefixes to strip from the front of a payee.
const PREFIX_RE = /^(d\/c from( from)?|tfr in|pmt to|credit|automatic payment|ap|direct credit)\s+/i

// Known abbreviations expanded before tokenising.
const ABBREV: Array<[RegExp, string]> = [
  [/\bb\s*&\s*t\b/g, 'barfoot'],
]

// Generic words that shouldn't drive a match on their own.
const STOPWORDS = new Set([
  'property', 'properties', 'limited', 'ltd', 'holdings', 'holding', 'the', 'and',
  'from', 'llc', 'inc', 'co', 'company', 'services', 'service', 'trust', 'management',
  'manage', 'prop', 'pty', 'group', 'nz', 'new', 'zealand', 'auckland', 'real', 'estate',
])

export function cleanPayee(raw: string): string {
  return (raw ?? '').toLowerCase().replace(PREFIX_RE, '').trim()
}

/** Significant tokens (≥3 chars, not stopwords), with abbreviations expanded. */
export function payeeTokens(raw: string): string[] {
  let s = cleanPayee(raw)
  for (const [re, to] of ABBREV) s = s.replace(re, to)
  return s
    .split(/[^a-z0-9]+/)
    .filter((t) => t.length >= 3 && !STOPWORDS.has(t))
}

/**
 * Client(s) that best match a bank payee. Each client name is scored by how
 * many distinct payee tokens it contains, and only the best-scoring client(s)
 * are returned.
 *
 * This narrows a branch payee to the specific branch: "B&T Remuera" expands to
 * tokens [barfoot, remuera], so "Barfoot & Thompson - Remuera" (matches both,
 * score 2) wins over "Barfoot & Thompson - Onehunga" (matches only barfoot,
 * score 1). A bare manager payee ("barfoot", one token) still ties across every
 * branch, so cross-branch bundle payments keep matching all branches.
 */
export function matchClientsForPayee(payee: string, clientNames: string[]): string[] {
  const tokens = payeeTokens(payee)
  if (tokens.length === 0) return []
  let best = 0
  const scored = clientNames.map((name) => {
    const l = name.toLowerCase()
    const score = tokens.reduce((n, t) => n + (l.includes(t) ? 1 : 0), 0)
    if (score > best) best = score
    return { name, score }
  })
  if (best === 0) return []
  return scored.filter((s) => s.score === best).map((s) => s.name)
}
