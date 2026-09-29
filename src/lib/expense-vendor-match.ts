// Map a bank-statement payee to a known EXPENSE vendor, so recurring costs
// prefill their category + GST treatment instead of being re-keyed every month.
//
// Why this exists: the expense form already prefills category and GST once it
// recognises a vendor name (see getVendorSuggestions), but the "Add expense"
// link from bank reconciliation passed only amount/date/reference — never a
// vendor — so the prefill never fired. Bank payees don't look like vendor
// names:
//
//   "GOOGLE WORKSPACE_SANO.NZ AUCKLAND"  → "Google Workspace"
//   "ELANTIS PREMIUM"                    → "Elantis"
//   "AC REFUSE STATION AUCKLAND"         → "Waitakere - Auckland Council"  (no match — see below)
//
// Sibling of payee-match.ts, which does the same job for INCOMING payments
// (payee → client). Kept separate because the noise words differ: an expense
// payee carries card-processing junk ("PMT TO", suburb names, "_sano.nz"),
// while a client payee carries property-management noise.
//
// Deliberately conservative: a wrong vendor silently prefills a wrong category
// and a wrong GST flag, which lands in a GST return. No match is a better
// outcome than a bad guess, so a single weak token match does not win.

/** Bank transaction-type prefixes stripped from the front of a payee. */
const PREFIX_RE = /^(pmt to|payment to|automatic payment|ap|direct debit|dd|eftpos|visa purchase|debit)\s+/i

/** Trailing location noise NZ bank statements append. */
const LOCATION_RE = /\s+(auckland|wellington|christchurch|hamilton|tauranga|nz|new zealand)\s*$/i

/**
 * Words that must not carry a match on their own — either generic company
 * suffixes, or words so common across vendors that matching on them alone
 * produces false positives.
 */
const STOPWORDS = new Set([
  'limited', 'ltd', 'inc', 'llc', 'co', 'company', 'the', 'and', 'nz', 'new', 'zealand',
  'auckland', 'wellington', 'christchurch', 'pty', 'group', 'holdings', 'trust',
  'premium', 'payment', 'purchase', 'station', 'services', 'service', 'online',
])

/** Lower-case, de-prefixed, de-located payee text. */
export function cleanExpensePayee(raw: string): string {
  let s = (raw ?? '').toLowerCase().trim()
  s = s.replace(PREFIX_RE, '')
  s = s.replace(LOCATION_RE, '')
  return s.trim()
}

/** Significant tokens (>= 3 chars, not stopwords) from a payee. */
export function expensePayeeTokens(raw: string): string[] {
  const cleaned = cleanExpensePayee(raw)
  return Array.from(
    new Set(
      cleaned
        .split(/[^a-z0-9]+/)
        .filter((t) => t.length >= 3 && !STOPWORDS.has(t)),
    ),
  )
}

export interface VendorCandidate {
  vendor: string
  category: string
  gst_inclusive: boolean
}

export interface VendorMatch extends VendorCandidate {
  /** How many payee tokens the vendor name matched. */
  score: number
}

/**
 * Best known vendor for a bank payee, or null when nothing matches confidently.
 *
 * Scoring: each vendor name scores one point per distinct payee token it
 * contains. The highest scorer wins, and a tie is treated as no match — two
 * plausible vendors mean we cannot tell which, and guessing would prefill the
 * wrong category.
 *
 * A one-token match is accepted only when that token is reasonably
 * distinguishing (>= 5 characters). "GOOGLE WORKSPACE_SANO.NZ" → "Google
 * Workspace" scores 2 and is safe; a payee whose only signal is a 3-letter
 * fragment is not.
 */
export function matchExpenseVendor(
  payee: string,
  candidates: readonly VendorCandidate[],
): VendorMatch | null {
  const tokens = expensePayeeTokens(payee)
  if (tokens.length === 0 || candidates.length === 0) return null

  const scored = candidates.map((c) => {
    const name = c.vendor.toLowerCase()
    const matched = tokens.filter((t) => name.includes(t))
    return { candidate: c, score: matched.length, matched }
  })

  const best = Math.max(...scored.map((s) => s.score))
  if (best === 0) return null

  const winners = scored.filter((s) => s.score === best)
  // Ambiguous — two vendors match equally well. Prefilling either could put the
  // wrong category and GST flag on a real expense.
  if (winners.length !== 1) return null

  const winner = winners[0]
  // Guard a single weak token: require it to be distinguishing.
  if (best === 1 && !winner.matched.some((t) => t.length >= 5)) return null

  return { ...winner.candidate, score: winner.score }
}
