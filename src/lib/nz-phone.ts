// NZ phone numbers → E.164, for Twilio.
//
// Twilio requires E.164 (`+64211234567`) and rejects a local number outright
// with error 21211. Every phone in this database is stored the way a person
// types it — `0220337295`, `022 024 2244`, `021 0277 0941` — and the sender
// passed that string straight through, so SMS could never have worked.
//
// The rule (confirmed with Mike): drop the leading 0, prefix +64.
//   0220337295      → +64220337295
//   022 024 2244    → +64220242244
//   09 123 4567     → +6491234567   (landlines work the same way)
//
// Formatting is stripped, an existing +64 is left alone, and anything that
// isn't a plausible number returns null rather than a guess — Twilio charges
// for a rejected send and the failure is silent to the operator.

/** NZ country calling code. */
export const NZ_COUNTRY_CODE = '+64'

/**
 * A national NZ subscriber number is 8–10 digits after the leading 0.
 * Mobiles run 021/022/027/etc with 7–9 digits following; landlines are a
 * 1-digit area code plus 7 digits. Bounds are deliberately loose — the job
 * here is to reject junk like "02", not to validate carrier ranges.
 */
const MIN_NATIONAL_DIGITS = 8
const MAX_NATIONAL_DIGITS = 10

/**
 * Convert an NZ phone number to E.164, or null when it can't be trusted.
 *
 * Returns null (never a guess) for: empty input, junk too short to be a
 * number, and non-NZ international numbers we shouldn't silently rewrite.
 */
export function toE164NZ(raw: string | null | undefined): string | null {
  if (!raw) return null

  // Strip everything a human might type: spaces, dashes, brackets, dots.
  const cleaned = raw.replace(/[^\d+]/g, '')
  if (!cleaned) return null

  // Already E.164 for NZ — trust it, but sanity-check the length.
  if (cleaned.startsWith(NZ_COUNTRY_CODE)) {
    const national = cleaned.slice(NZ_COUNTRY_CODE.length)
    if (!isPlausibleNational(national)) return null
    return `${NZ_COUNTRY_CODE}${national}`
  }

  // Another country's number — don't rewrite it as NZ.
  if (cleaned.startsWith('+')) return null

  // 0064... / 64... — the country code without the plus.
  if (cleaned.startsWith('0064')) {
    const national = cleaned.slice(4)
    return isPlausibleNational(national) ? `${NZ_COUNTRY_CODE}${national}` : null
  }
  if (cleaned.startsWith('64') && isPlausibleNational(cleaned.slice(2))) {
    return `${NZ_COUNTRY_CODE}${cleaned.slice(2)}`
  }

  // The normal case: a local number starting 0. Drop it, prefix +64.
  if (cleaned.startsWith('0')) {
    const national = cleaned.slice(1)
    return isPlausibleNational(national) ? `${NZ_COUNTRY_CODE}${national}` : null
  }

  // No leading 0 and no country code — e.g. "220337295" pasted without it.
  return isPlausibleNational(cleaned) ? `${NZ_COUNTRY_CODE}${cleaned}` : null
}

/** Is this a plausible NZ national number (post leading-0)? */
function isPlausibleNational(national: string): boolean {
  if (!/^\d+$/.test(national)) return false
  if (national.length < MIN_NATIONAL_DIGITS) return false
  if (national.length > MAX_NATIONAL_DIGITS) return false
  // A national number never starts with 0 — "00..." means the strip went wrong.
  if (national.startsWith('0')) return false
  return true
}

/** Is this number usable for SMS? */
export function isSmsCapableNZ(raw: string | null | undefined): boolean {
  return toE164NZ(raw) !== null
}

/**
 * Is this an NZ MOBILE (02x)? Landlines normalise fine but can't receive SMS,
 * so a caller can warn instead of paying for a guaranteed failure.
 */
export function isNZMobile(raw: string | null | undefined): boolean {
  const e164 = toE164NZ(raw)
  if (!e164) return false
  return e164.startsWith(`${NZ_COUNTRY_CODE}2`)
}

/** Readable form for the UI: `021 234 5678`. Falls back to the input. */
export function formatNZPhoneDisplay(raw: string | null | undefined): string {
  const e164 = toE164NZ(raw)
  if (!e164) return (raw ?? '').trim()
  const national = `0${e164.slice(NZ_COUNTRY_CODE.length)}`
  // Grouped for reading, not for dialling: 3-digit prefix, then the rest split
  // in half so the trailing group carries any odd digit (022 033 7295).
  if (national.startsWith('02')) {
    const prefix = national.slice(0, 3)
    const rest = national.slice(3)
    if (rest.length <= 3) return `${prefix} ${rest}`.trim()
    const split = Math.floor(rest.length / 2)
    return `${prefix} ${rest.slice(0, split)} ${rest.slice(split)}`.trim()
  }
  // Landline: 2-digit area code, then 3 + remainder.
  return `${national.slice(0, 2)} ${national.slice(2, 5)} ${national.slice(5)}`.trim()
}
