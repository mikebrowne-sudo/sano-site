// Greeting resolver for customer-facing quote / invoice emails.
//
// Goal: greet the actual contact PERSON ("Hi Jamie,"), never the
// company / account / branch ("Hi Barfoot,", "Hi Wendell,"). When no
// person-like name is available we fall back to a safe "Hi there,".
//
// Deliberately conservative: if a candidate name looks like a company or
// branch (contains "&", a " - " branch split, a company keyword, or it
// just equals the account name) we skip it rather than risk a bad
// greeting. A skipped candidate falls through to the next, then to the
// fallback. Recipient routing is unaffected — this only picks the name.

const FALLBACK = 'Hi there,'

// Words that mark a name as a company / branch / agency rather than a
// person. Word-boundary matched so real names like "Holly" or "Grouper"
// don't trip "holdings" / "group".
const COMPANY_HINTS = /\b(property|properties|barfoot|thompson|ray\s*white|harcourt|wendell|limited|ltd|management|realty|real\s*estate|rentals?|body\s*corporate|enterprises|group|holdings|company|scouts|trust)\b/i

/** Does this string look like a real person's name (worth greeting)? */
export function isPersonName(name?: string | null, accountName?: string | null): boolean {
  const n = (name ?? '').trim()
  if (!n) return false
  if (accountName && n.toLowerCase() === accountName.trim().toLowerCase()) return false
  if (n.includes('&')) return false
  if (/\s[-–—]\s/.test(n)) return false // "Company - Branch"
  if (COMPANY_HINTS.test(n)) return false
  return true
}

/** The first name to greet, or null if the candidate isn't person-like. */
export function greetingFirstName(name?: string | null, accountName?: string | null): string | null {
  if (!isPersonName(name, accountName)) return null
  return (name as string).trim().split(/\s+/)[0]
}

/**
 * Resolve the email greeting line from an ordered list of candidate
 * names (best first). Returns "Hi <FirstName>," for the first person-like
 * candidate, otherwise "Hi there,". `accountName` is the client/account
 * name, used to reject candidates that merely echo it.
 */
export function resolveGreeting(
  candidates: Array<string | null | undefined>,
  accountName?: string | null,
): string {
  for (const c of candidates) {
    const first = greetingFirstName(c, accountName)
    if (first) return `Hi ${first},`
  }
  return FALLBACK
}
