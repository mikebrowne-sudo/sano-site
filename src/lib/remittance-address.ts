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

const STREET_WORDS = new Set([
  'road', 'avenue', 'street', 'drive', 'place', 'crescent', 'terrace',
  'highway', 'lane', 'close', 'court', 'way', 'grove', 'rise', 'parade',
  'square', 'mount',
])

/** A note segment that reads like a street address: starts with a number
 *  and either names a street type or reuses a word from the job address. */
function isAddressLike(segment: string, address: string): boolean {
  const tokens = normTokens(segment)
  if (tokens.length === 0) return false
  const hasNumber = tokens.some((t) => /^\d/.test(t))
  if (!hasNumber) return false
  const hasStreetWord = tokens.some((t) => STREET_WORDS.has(t))
  const addrTokens = new Set(normTokens(address))
  const sharesAddrWord = tokens.some((t) => !/^\d/.test(t) && t.length > 2 && addrTokens.has(t))
  return hasStreetWord || sharesAddrWord
}

// Words that mark a note segment as a genuine service type / payment
// reason worth showing as a second line. Property-manager and client
// labels ("Barfoot Royal Heights", "Wendell Property") and address
// fragments contain none of these and are therefore hidden.
const SERVICE_KEYWORDS = [
  'carpet', 'oven', 'fridge', 'freezer', 'stain', 'removal', 'upholstery',
  'window', 'tile', 'grout', 'mould', 'mold', 'steam', 'curtain', 'blind',
  'mattress', 'sofa', 'rug', 'clean', 'wash', 'polish', 'sanitis', 'sanitiz',
  'spring', 'declutter', 'tidy',
]

function hasServiceKeyword(segment: string): boolean {
  const lower = segment.toLowerCase()
  return SERVICE_KEYWORDS.some((k) => lower.includes(k))
}

/**
 * The note line to show UNDER a remittance job line, or null to show
 * nothing. Deliberately conservative for a contractor-facing document:
 * only a genuine service type / payment reason is shown.
 *
 *   "Carpet clean - 2 Crudge St"            → "Carpet clean"
 *   "Oven clean"                            → "Oven clean"
 *   "Barfoot Royal Heights - 8/28 Buscomb"  → null (client/PM label)
 *   "8/39 Pitt St" / "128 Marsden Ave"      → null (address fragment)
 *
 * A second line appears only when a note segment names a service keyword
 * (carpet/oven/fridge/stain/clean/…) and does not read like an address.
 * Property-manager labels, partial addresses and duplicate address text
 * are never shown. When there is no job address the note is used as the
 * primary line elsewhere, so this returns null.
 */
export function cleanRemittanceNote(
  note: string | null | undefined,
  address: string | null | undefined,
): string | null {
  const trimmed = (note ?? '').trim()
  if (!trimmed) return null
  const a = (address ?? '').trim()
  if (!a) return null // no address — the note is the primary line, no second line

  // Split on dash separators (hyphen / en / em dash); keep only segments
  // that name a service type and don't read like a street address.
  const segments = trimmed.split(/\s+[-–—]\s+/).map((s) => s.trim()).filter(Boolean)
  const kept = segments.filter((s) => hasServiceKeyword(s) && !isAddressLike(s, a))
  if (kept.length === 0) return null
  return kept.join(' - ')
}

/**
 * The note to STORE on a remittance line when a batch is created. Cleaning
 * happens ONCE here (not at render), so the document prints the stored note
 * verbatim and the operator can edit it freely on the remittance edit page.
 *
 *   - A dumped job-scope paragraph is never auto-seeded (a note is short).
 *   - A genuine short service note ("Carpet clean") is kept; property-manager
 *     labels and address fragments are dropped (via cleanRemittanceNote).
 */
export function seedRemittanceNote(
  note: string | null | undefined,
  address: string | null | undefined,
): string | null {
  const trimmed = (note ?? '').trim()
  if (!trimmed) return null
  if (trimmed.length > 90) return null // a full job description, not a note
  return cleanRemittanceNote(trimmed, address)
}
