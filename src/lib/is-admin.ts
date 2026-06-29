// Phase D.3 / E — central admin check.
//
// A dozen files across the portal derive admin access by checking
// `user.email === 'michael@sano.nz'` inline. This helper gives
// callers one thing to import + one constant to update when admin
// identity changes (e.g. becomes a role claim).
//
// Intentionally synchronous and dependency-free so it can be
// imported from both client and server components.

// Primary admin. Kept as a single constant for backwards-compatible
// imports (e.g. cleanup-mode re-export + tests).
export const ADMIN_EMAIL = 'michael@sano.nz'

// Full-admin accounts. IMPORTANT: keep this set in sync with the DB
// `public.is_admin()` function used by RLS — see
// docs/db/2026-06-12-admin-is-admin-function.sql. The app check (this
// file) gates the UI + server actions; the DB function gates writes.
export const ADMIN_EMAILS: readonly string[] = [ADMIN_EMAIL, 'carol@sano.nz']

export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false
  const lower = email.toLowerCase()
  return ADMIN_EMAILS.some((a) => a.toLowerCase() === lower)
}

export function isAdminUser(user: { email?: string | null } | null | undefined): boolean {
  return isAdminEmail(user?.email ?? null)
}

// Accountant accounts — read-only access to the finance area only. Keep this
// set in sync with the DB `public.is_finance()` function (see
// docs/db/2026-06-25-finance-readonly-role.sql), which gates SELECT on the
// finance tables. These accounts are NOT admins: they can view + export
// finance data but cannot write anything.
export const ACCOUNTANT_EMAILS: readonly string[] = ['john@taxaction.co.nz', 'jason@taxaction.co.nz']

export function isAccountantEmail(email: string | null | undefined): boolean {
  if (!email) return false
  const lower = email.toLowerCase()
  return ACCOUNTANT_EMAILS.some((a) => a.toLowerCase() === lower)
}

export function isAccountantUser(user: { email?: string | null } | null | undefined): boolean {
  return isAccountantEmail(user?.email ?? null)
}

/** Can view the finance area: admins OR accountants. */
export function isFinanceEmail(email: string | null | undefined): boolean {
  return isAdminEmail(email) || isAccountantEmail(email)
}

export function isFinanceUser(user: { email?: string | null } | null | undefined): boolean {
  return isFinanceEmail(user?.email ?? null)
}
