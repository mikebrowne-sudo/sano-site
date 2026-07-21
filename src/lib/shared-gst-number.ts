// Non-blocking staff warning: the same GST number on more than one ACTIVE
// contractor profile.
//
// A shared GST number is NOT automatically invalid. The same number can
// legitimately belong to a single partnership / company / entity that has more
// than one profile, or to a valid GST group — or it can be a copy-paste error.
// So we never auto-void the number and never block saving; we only surface it
// for staff to verify. Matching is done on the numeric digits so formatting
// differences ("123-456-789" vs "123456789") don't hide a genuine collision.

export interface GstProfile {
  id: string
  full_name: string | null
  gst_number?: string | null
}

/** Strip everything but digits, so formatting never masks a shared number. */
export function normalizeGstNumber(n: string | null | undefined): string {
  return (n ?? '').replace(/\D/g, '')
}

/**
 * Other active profiles that share `gstNumber` (excluding `selfId`). `all`
 * should already be the set of active contractors with a GST number on file.
 */
export function findSharedGstProfiles(
  gstNumber: string | null | undefined,
  selfId: string,
  all: GstProfile[],
): GstProfile[] {
  const norm = normalizeGstNumber(gstNumber)
  if (!norm) return []
  return all.filter((c) => c.id !== selfId && normalizeGstNumber(c.gst_number) === norm)
}

/**
 * Staff-facing warning text when a GST number is shared across active profiles.
 * Returns null when there's nothing to warn about. Reminder only — nothing is
 * blocked, and the number is never treated as invalid.
 */
export function sharedGstWarning(
  gstNumber: string | null | undefined,
  others: GstProfile[],
): string | null {
  const num = gstNumber?.trim()
  if (!num || others.length === 0) return null
  const names = others.map((o) => o.full_name?.trim() || 'Unnamed contractor').join(', ')
  const plural = others.length === 1 ? 'profile' : 'profiles'
  return `GST number ${num} is also on ${others.length} other active contractor ${plural}: ${names}. Confirm these are the same partnership, company or entity — or a valid GST group — or fix a number entered in error. This is a reminder only; nothing is blocked.`
}
