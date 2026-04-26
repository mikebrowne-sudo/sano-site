'use server'

// Phase 5.5.2 — Staff CRUD + invite/disable actions.
//
// Admin-only writes (RLS already enforces, but the actions add a
// defensive check too). All meaningful mutations write an audit_log
// entry with entity_table='staff'.
//
// Invite path reuses the Phase 5.5.1 `inviteUser` helper, which mints
// the link via Supabase service role + sends the email via Resend.

import { createClient } from '@/lib/supabase-server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import {
  inviteUser,
  disableAccess as disableAuthAccess,
  enableAccess as enableAuthAccess,
} from '@/lib/auth-invites'

const ADMIN_EMAIL = 'michael@sano.nz'
type Role = 'admin' | 'staff'

function isValidEmail(s: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s)
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function requireAdmin(supabase: any): Promise<{ user: { id: string; email: string } } | { error: string }> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated.' }
  if (user.email !== ADMIN_EMAIL) return { error: 'Admin only.' }
  return { user: { id: user.id, email: user.email } }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function writeAudit(supabase: any, userId: string, staffId: string, before: Record<string, unknown>, after: Record<string, unknown>, action: string) {
  await supabase.from('audit_log').insert({
    actor_id: userId,
    actor_role: 'admin',
    action,
    entity_table: 'staff',
    entity_id: staffId,
    before, after,
  })
}

export async function createStaff(input: {
  full_name: string
  email: string
  role: Role
}): Promise<{ ok: true; id: string } | { error: string }> {
  const supabase = createClient()
  const auth = await requireAdmin(supabase)
  if ('error' in auth) return auth

  const fullName = input.full_name.trim()
  const email = input.email.trim().toLowerCase()
  if (!fullName) return { error: 'Full name is required.' }
  if (!email || !isValidEmail(email)) return { error: 'A valid email is required.' }
  if (!['admin', 'staff'].includes(input.role)) return { error: 'Invalid role.' }

  const { data: existing } = await supabase
    .from('staff')
    .select('id')
    .ilike('email', email)
    .limit(1)
  if (existing && existing.length > 0) {
    return { error: 'A staff record with this email already exists.' }
  }

  const { data, error } = await supabase
    .from('staff')
    .insert({ full_name: fullName, email, role: input.role })
    .select('id')
    .single()
  if (error) return { error: error.message }
  const staff = data as { id: string }

  await writeAudit(supabase, auth.user.id, staff.id, {},
    { full_name: fullName, email, role: input.role },
    'staff.created',
  )

  revalidatePath('/portal/staff')
  return { ok: true, id: staff.id }
}

export async function updateStaff(input: {
  id: string
  full_name: string
  email: string
  role: Role
}): Promise<{ ok: true } | { error: string }> {
  const supabase = createClient()
  const auth = await requireAdmin(supabase)
  if ('error' in auth) return auth

  const fullName = input.full_name.trim()
  const email = input.email.trim().toLowerCase()
  if (!fullName) return { error: 'Full name is required.' }
  if (!email || !isValidEmail(email)) return { error: 'A valid email is required.' }
  if (!['admin', 'staff'].includes(input.role)) return { error: 'Invalid role.' }

  // Email-change dedup check (excluding self).
  const { data: existing } = await supabase
    .from('staff')
    .select('id')
    .ilike('email', email)
    .neq('id', input.id)
    .limit(1)
  if (existing && existing.length > 0) {
    return { error: 'Another staff record already uses this email.' }
  }

  const { data: prev } = await supabase
    .from('staff')
    .select('full_name, email, role')
    .eq('id', input.id)
    .maybeSingle()

  const { error } = await supabase
    .from('staff')
    .update({ full_name: fullName, email, role: input.role })
    .eq('id', input.id)
  if (error) return { error: error.message }

  await writeAudit(supabase, auth.user.id, input.id,
    (prev ?? {}) as Record<string, unknown>,
    { full_name: fullName, email, role: input.role },
    'staff.updated',
  )

  revalidatePath('/portal/staff')
  revalidatePath(`/portal/staff/${input.id}`)
  return { ok: true }
}

export async function inviteStaffUser(input: {
  staffId: string
}): Promise<{ ok: true; flow: 'invite' | 'recovery' } | { error: string }> {
  const supabase = createClient()
  const auth = await requireAdmin(supabase)
  if ('error' in auth) return auth

  const { data: staff } = await supabase
    .from('staff')
    .select('id, full_name, email, auth_user_id, access_disabled_at')
    .eq('id', input.staffId)
    .maybeSingle()
  if (!staff) return { error: 'Staff record not found.' }
  const s = staff as {
    id: string
    full_name: string
    email: string
    auth_user_id: string | null
    access_disabled_at: string | null
  }

  if (s.access_disabled_at) {
    return { error: 'This staff member is disabled. Re-enable access before re-inviting.' }
  }

  const result = await inviteUser({
    email: s.email,
    fullName: s.full_name,
    redirectAfter: 'portal',
  })
  if ('error' in result) return result

  const nowIso = new Date().toISOString()
  const updates: Record<string, unknown> = { invite_sent_at: nowIso }
  if (result.authUserId && !s.auth_user_id) {
    updates.auth_user_id = result.authUserId
  }

  await supabase.from('staff').update(updates).eq('id', input.staffId)

  await writeAudit(supabase, auth.user.id, input.staffId,
    { invite_sent_at: null, auth_user_id: s.auth_user_id },
    { invite_sent_at: nowIso, auth_user_id: result.authUserId ?? s.auth_user_id, flow: result.flow },
    'staff.invite_sent',
  )

  revalidatePath('/portal/staff')
  revalidatePath(`/portal/staff/${input.staffId}`)
  return { ok: true, flow: result.flow }
}

export async function disableStaffAccess(input: {
  staffId: string
  reason: string
}): Promise<{ ok: true } | { error: string }> {
  if (!input.reason.trim()) return { error: 'A reason is required.' }
  const supabase = createClient()
  const auth = await requireAdmin(supabase)
  if ('error' in auth) return auth

  const { data: staff } = await supabase
    .from('staff')
    .select('id, auth_user_id, access_disabled_at')
    .eq('id', input.staffId)
    .maybeSingle()
  if (!staff) return { error: 'Staff record not found.' }
  const s = staff as { id: string; auth_user_id: string | null; access_disabled_at: string | null }

  // Prevent admin disabling their own access (lockout).
  if (s.auth_user_id === auth.user.id) {
    return { error: 'You cannot disable your own access.' }
  }

  // Ban the auth user (if linked) so login is blocked at the auth layer too.
  if (s.auth_user_id) {
    const banResult = await disableAuthAccess({ authUserId: s.auth_user_id })
    if ('error' in banResult) return banResult
  }

  const nowIso = new Date().toISOString()
  const { error } = await supabase
    .from('staff')
    .update({
      access_disabled_at: nowIso,
      access_disabled_reason: input.reason.trim(),
    })
    .eq('id', input.staffId)
  if (error) return { error: error.message }

  await writeAudit(supabase, auth.user.id, input.staffId,
    { access_disabled_at: s.access_disabled_at },
    { access_disabled_at: nowIso, access_disabled_reason: input.reason.trim() },
    'staff.access_disabled',
  )

  revalidatePath('/portal/staff')
  revalidatePath(`/portal/staff/${input.staffId}`)
  return { ok: true }
}

export async function enableStaffAccess(input: {
  staffId: string
}): Promise<{ ok: true } | { error: string }> {
  const supabase = createClient()
  const auth = await requireAdmin(supabase)
  if ('error' in auth) return auth

  const { data: staff } = await supabase
    .from('staff')
    .select('id, auth_user_id, access_disabled_at')
    .eq('id', input.staffId)
    .maybeSingle()
  if (!staff) return { error: 'Staff record not found.' }
  const s = staff as { id: string; auth_user_id: string | null; access_disabled_at: string | null }

  if (!s.access_disabled_at) {
    return { error: 'Access is not currently disabled.' }
  }

  if (s.auth_user_id) {
    const unbanResult = await enableAuthAccess({ authUserId: s.auth_user_id })
    if ('error' in unbanResult) return unbanResult
  }

  const { error } = await supabase
    .from('staff')
    .update({ access_disabled_at: null, access_disabled_reason: null })
    .eq('id', input.staffId)
  if (error) return { error: error.message }

  await writeAudit(supabase, auth.user.id, input.staffId,
    { access_disabled_at: s.access_disabled_at },
    { access_disabled_at: null },
    'staff.access_enabled',
  )

  revalidatePath('/portal/staff')
  revalidatePath(`/portal/staff/${input.staffId}`)
  return { ok: true }
}

// Called from the reset-password page after a successful password
// update. Silent if the current user has no staff record (e.g. the
// reset belongs to a contractor) — keeps the reset flow uniform.
export async function markStaffInviteAccepted(): Promise<{ ok: true }> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: true }

  await supabase
    .from('staff')
    .update({ invite_accepted_at: new Date().toISOString() })
    .eq('auth_user_id', user.id)
    .is('invite_accepted_at', null)

  return { ok: true }
}

// Convenience wrapper used by the New Staff page so the form can
// redirect to the new record on success.
export async function createStaffAndRedirect(formData: FormData): Promise<void> {
  const result = await createStaff({
    full_name: String(formData.get('full_name') ?? ''),
    email: String(formData.get('email') ?? ''),
    role: (String(formData.get('role') ?? 'staff') as Role),
  })
  if ('error' in result) {
    // Re-raise so the form sees it; the form handler can read the
    // error via useTransition state. We return the error path via
    // throwing so the redirect doesn't fire on failure.
    throw new Error(result.error)
  }
  redirect(`/portal/staff/${result.id}`)
}
