// Presentation helpers for the contractor remittance advice.
//
// Goal: a short, readable job detail line that doesn't double up. The
// raw job address carries postcode + "New Zealand" (e.g.
// "28 Netherlands Avenue, Kelston, Auckland 0602, New Zealand") and the
// invoice note often just restates the same address. We want
// "28 Netherlands Avenue, Kelston" on one line, and we only surface the
// note when it genuinely adds something (a property name, a service
// type, a different unit) rather than echoing the address.
//
// Deliberately conservative — no external geocoding, no clever parsing
// that could mangle an unusual address. When in doubt we keep what we
// have.

const STREET_ABBR: Record<string, string> = {
  rd: 'road', ave: 'avenue', av: 'avenue', st: 'street', dr: 'drive',
  pl: 'place', cres: 'crescent', cr: 'crescent', tce: 'terrace',
  hwy: 'highway', ln: 'lane', cl: 'close', mt: 'mount', sq: 'square',
}

/** Lowercase word tokens, expanding common street abbreviations so
 *  "Pitt St" and "Pitt Street" compare equal. Splits on whitespace and
 *  slashes (so "8/39" → "8", "39"). */
function normTokens(s: string): string[] {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9/ ]+/g, ' ')
    .split(/[\s/]+/)
    .filter(Boolean)
    .map((t) => STREET_ABBR[t] ?? t)
}

/**
 * Short, print-friendly address: street + suburb, no postcode, no
 * country, no trailing commas, no obvious duplicated segment.
 *
 *   "4 Alderley Road, Mount Eden, Auckland 1024, New Zealand"
 *     → "4 Alderley Road, Mount Eden"
 *   "8/39 Pitt Street, Auckland Central, Auckland 1010, New Zealand"
 *     → "8/39 Pitt Street, Auckland Central"
 */
export function cleanRemittanceAddress(raw: string | null | undefined): string | null {
  if (!raw) return null
  const parts = raw.split(',').map((p) => p.trim()).filter(Boolean)
  const kept: string[] = []
  for (const part of parts) {
    if (/^new zealand$/i.test(part)) continue
    if (/^nz$/i.test(part)) continue
    // City + postcode tail ("Auckland 0610") or a bare postcode ("0610").
    // Matches only a 4-digit group at the END of the segment, so a street
    // number like "1024 Great North Road" is preserved.
    if (/\b\d{4}\s*$/.test(part)) continue
    // Drop an obvious consecutive duplicate (e.g. "Henderson, Henderson").
    if (kept.length && kept[kept.length - 1].toLowerCase() === part.toLowerCase()) continue
    kept.push(part)
  }
  const out = kept.join(', ').trim()
  if (out) return out
  // Everything got stripped — fall back to the first segment minus any
  // trailing postcode, then to the raw string. Never return empty.
  const first = parts[0]?.replace(/\s*\b\d{4}\s*$/, '').trim()
  return first || raw.trim() || null
}

/**
 * Does the invoice note add anything beyond the (cleaned) address?
 *
 * Returns false when the note is basically the same address — every
 * note word already appears in the address, or the two overlap heavily
 * (token Jaccard ≥ 0.5, which tolerates abbreviations and minor typos
 * like "Alderly"/"Alderley", "Mt"/"Mount"). Returns true when the note
 * carries distinct information (a property name, a service type such as
 * "Carpet clean", a different unit number).
 */
export function noteAddsValue(
  note: string | null | undefined,
  address: string | null | undefined,
): boolean {
  const n = (note ?? '').trim()
  if (!n) return false
  const a = (address ?? '').trim()
  if (!a) return true // no address to compare against — the note is the only detail

  const noteTokens = new Set(normTokens(n))
  const addrTokens = new Set(normTokens(a))
  if (noteTokens.size === 0) return false

  let inter = 0
  Array.from(noteTokens).forEach((t) => { if (addrTokens.has(t)) inter++ })
  // Every note word already in the address → pure restatement.
  if (inter === noteTokens.size) return false

  const union = new Set(Array.from(noteTokens).concat(Array.from(addrTokens))).size
  const jaccard = union === 0 ? 0 : inter / union
  // Heavy overlap (> 0.5) is a restatement; at/below 0.5 the note carries
  // enough distinct words (a property name, a service type) to be worth showing.
  return jaccard <= 0.5
}
