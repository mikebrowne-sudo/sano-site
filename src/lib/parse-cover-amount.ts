// Parse a free-text public-liability cover amount (as typed by a contractor on
// the sign form, e.g. "$1,000,000") into the numeric value stored in
// contractors.insurance_liability_cover (a numeric column).
//
// Best-effort convenience only: the staff contractor form remains the
// authoritative editor for this figure, so an odd input here is easily
// corrected. Returns null when nothing sensible can be parsed.

export function parseCoverAmount(input?: string | null): number | null {
  if (!input) return null
  // Keep digits and decimal points only ("$1,000,000" -> "1000000").
  const cleaned = input.replace(/[^0-9.]/g, '')
  if (!cleaned) return null
  const n = Number(cleaned)
  if (!Number.isFinite(n) || n <= 0) return null
  return n
}
