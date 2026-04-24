// Phase D.3 — central admin check.
//
// A dozen files across the portal derive admin access by checking
// `user.email === 'michael@sano.nz'` inline. This helper gives
// callers one thing to import + one constant to update when admin
// identity changes (e.g. becomes a role claim).
//
// Two shapes:
//   • ADMIN_EMAIL — the single string constant.
//   • isAdminEmail(email) — null-safe email check.
//   • isAdminUser(user) — for the typical Supabase User shape.
//
// Intentionally synchronous and dependency-free so it can be
// imported from both client and server components.

export const ADMIN_EMAIL = 'michael@sano.nz'

export function isAdminEmail(email: string | null | undefined): boolean {
  return !!email && email.toLowerCase() === ADMIN_EMAIL
}

export function isAdminUser(user: { email?: string | null } | null | undefined): boolean {
  return isAdminEmail(user?.email ?? null)
}
