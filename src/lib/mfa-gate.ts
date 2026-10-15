// Two-factor (TOTP) gate for the staff portal — required for cyber insurance
// ("MFA for any and all remote access", 2026-10-16).
//
// Supabase reports an Authenticator Assurance Level (AAL) for the session:
//   currentLevel = what this session has proven (aal1 = password only,
//                  aal2 = password + authenticator code)
//   nextLevel    = what it COULD reach (aal2 when a verified factor exists)
// So:
//   next = aal1            → no authenticator set up yet → send to set-up
//   current aal1, next aal2 → has one, not entered this session → ask for code
//   current aal2           → fully signed in

export type MfaStep = 'ok' | 'enroll' | 'verify'

export interface AalInfo {
  currentLevel: string | null
  nextLevel: string | null
}

export function mfaStep(aal: AalInfo | null | undefined): MfaStep {
  if (!aal) return 'enroll'
  if (aal.currentLevel === 'aal2') return 'ok'
  if (aal.nextLevel === 'aal2') return 'verify'
  return 'enroll'
}

/**
 * Rollout switch. Anyone who HAS an authenticator must always enter its code.
 * Forcing everyone to SET ONE UP waits for PORTAL_MFA_REQUIRED=true, so the
 * first admin can enrol (proving TOTP works on the live project) before the
 * rule can lock anyone out.
 */
export function mfaEnrolmentRequired(): boolean {
  return process.env.PORTAL_MFA_REQUIRED === 'true'
}

/** What the gate actually enforces right now. */
export function enforcedStep(step: MfaStep, enrolmentRequired: boolean): MfaStep {
  if (step === 'enroll' && !enrolmentRequired) return 'ok'
  return step
}

/** Staff-portal paths that stay reachable before the second factor. */
export const MFA_EXEMPT_PORTAL_PATHS = [
  '/portal/login',
  '/portal/auth/callback',
  '/portal/reset-password',
  '/portal/forgot-password',
  '/portal/mfa',
  '/portal/mfa/setup',
]

export function isMfaExempt(path: string): boolean {
  return MFA_EXEMPT_PORTAL_PATHS.includes(path)
}

/** Where to send someone for their MFA step, remembering where they were going. */
export function mfaRedirectPath(step: Exclude<MfaStep, 'ok'>, nextPath: string): string {
  const base = step === 'enroll' ? '/portal/mfa/setup' : '/portal/mfa'
  const safeNext = nextPath.startsWith('/portal') && !isMfaExempt(nextPath) ? nextPath : '/portal'
  return `${base}?next=${encodeURIComponent(safeNext)}`
}

/** Only ever follow a ?next= back into the portal (no open redirects). */
export function safeNextPath(next: string | null | undefined): string {
  if (!next || !next.startsWith('/portal') || next.startsWith('//') || isMfaExempt(next)) return '/portal'
  return next
}
