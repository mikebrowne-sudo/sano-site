'use server'

// Phase 5.5.3 — Contractor portal access actions.
//
// Mirrors the staff invite/disable/enable pattern from 5.5.2 with
// contractors as the entity. Reuses the Phase 5.5.1 inviteUser /
// disableAccess / enableAccess helpers.
//
// markContractorInviteAccepted is called from the reset-password
// page after a successful password set; silent if no contractor
// matches the current user.

import { createClient } from '@/lib/supabase-server'
import { revalidatePath } from 'next/cache'
import {
  inviteUser,
  disableAccess as disableAuthAccess,
  enableAccess as enableAuthAccess,
} from '@/lib/auth-invites'
import { loadWorkforceSettings } from '@/lib/workforce-settings'

const ADMIN_EMAIL = 'michael@sano.nz'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function requireAdmin(supabase: any): Promise<{ user: { id: string } } | { error: string }> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated.' }
  if (user.email !== ADMIN_EMAIL) return { error: 'Admin only.' }
  return { user: { id: user.id } }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function writeAudit(supabase: any, userId: string, contractorId: string, before: Record<string, unknown>, after: Record<string, unknown>, action: string) {
  await supabase.from('audit_log').insert({
    actor_id: userId,
    actor_role: 'admin',
    action,
    entity_table: 'contractors',
    entity_id: contractorId,
    before, after,
  })
}

export async function inviteContractorUser(input: {
  contractorId: string
}): Promise<{ ok: true; flow: 'invite' | 'recovery' } | { error: string }> {
  const supabase = createClient()
  const auth = await requireAdmin(supabase)
  if ('error' in auth) return auth

  const settings = await loadWorkforceSettings(supabase)
  if (!settings.enable_contractor_portal) {
    return { error: 'Contractor portal is disabled in workforce settings.' }
  }

  const { data: c } = await supabase
    .from('contractors')
    .select('id, full_name, email, auth_user_id, access_disabled_at')
    .eq('id', input.contractorId)
    .maybeSingle()
  if (!c) return { error: 'Contractor not found.' }
  const contractor = c as {
    id: string
    full_name: string
    email: string | null
    auth_user_id: string | null
    access_disabled_at: string | null
  }

  if (contractor.access_disabled_at) {
    return { error: 'Access is disabled. Re-enable before re-inviting.' }
  }
  if (!contractor.email?.trim()) {
    return { error: 'Contractor has no email on file.' }
  }

  const result = await inviteUser({
    email: contractor.email,
    fullName: contractor.full_name,
    redirectAfter: 'contractor',
  })
  if ('error' in result) return result

  const nowIso = new Date().toISOString()
  const updates: Record<string, unknown> = { invite_sent_at: nowIso }
  if (result.authUserId && !contractor.auth_user_id) {
    updates.auth_user_id = result.authUserId
  }

  await supabase.from('contractors').update(updates).eq('id', input.contractorId)

  await writeAudit(supabase, auth.user.id, input.contractorId,
    { invite_sent_at: null, auth_user_id: contractor.auth_user_id },
    { invite_sent_at: nowIso, auth_user_id: result.authUserId ?? contractor.auth_user_id, flow: result.flow },
    'contractor.invite_sent',
  )

  revalidatePath('/portal/contractors')
  revalidatePath(`/portal/contractors/${input.contractorId}`)
  return { ok: true, flow: result.flow }
}

export async function disableContractorAccess(input: {
  contractorId: string
  reason: string
}): Promise<{ ok: true } | { error: string }> {
  if (!input.reason.trim()) return { error: 'A reason is required.' }
  const supabase = createClient()
  const auth = await requireAdmin(supabase)
  if ('error' in auth) return auth

  const { data: c } = await supabase
    .from('contractors')
    .select('id, auth_user_id, access_disabled_at')
    .eq('id', input.contractorId)
    .maybeSingle()
  if (!c) return { error: 'Contractor not found.' }
  const contractor = c as { id: string; auth_user_id: string | null; access_disabled_at: string | null }

  if (contractor.auth_user_id) {
    const banResult = await disableAuthAccess({ authUserId: contractor.auth_user_id })
    if ('error' in banResult) return banResult
  }

  const nowIso = new Date().toISOString()
  const { error } = await supabase
    .from('contractors')
    .update({
      access_disabled_at: nowIso,
      access_disabled_reason: input.reason.trim(),
    })
    .eq('id', input.contractorId)
  if (error) return { error: error.message }

  await writeAudit(supabase, auth.user.id, input.contractorId,
    { access_disabled_at: contractor.access_disabled_at },
    { access_disabled_at: nowIso, access_disabled_reason: input.reason.trim() },
    'contractor.access_disabled',
  )

  revalidatePath('/portal/contractors')
  revalidatePath(`/portal/contractors/${input.contractorId}`)
  return { ok: true }
}

export async function enableContractorAccess(input: {
  contractorId: string
}): Promise<{ ok: true } | { error: string }> {
  const supabase = createClient()
  const auth = await requireAdmin(supabase)
  if ('error' in auth) return auth

  const { data: c } = await supabase
    .from('contractors')
    .select('id, auth_user_id, access_disabled_at')
    .eq('id', input.contractorId)
    .maybeSingle()
  if (!c) return { error: 'Contractor not found.' }
  const contractor = c as { id: string; auth_user_id: string | null; access_disabled_at: string | null }

  if (!contractor.access_disabled_at) {
    return { error: 'Access is not currently disabled.' }
  }

  if (contractor.auth_user_id) {
    const unbanResult = await enableAuthAccess({ authUserId: contractor.auth_user_id })
    if ('error' in unbanResult) return unbanResult
  }

  const { error } = await supabase
    .from('contractors')
    .update({ access_disabled_at: null, access_disabled_reason: null })
    .eq('id', input.contractorId)
  if (error) return { error: error.message }

  await writeAudit(supabase, auth.user.id, input.contractorId,
    { access_disabled_at: contractor.access_disabled_at },
    { access_disabled_at: null },
    'contractor.access_enabled',
  )

  revalidatePath('/portal/contractors')
  revalidatePath(`/portal/contractors/${input.contractorId}`)
  return { ok: true }
}

// Called from the reset-password page after a successful password
// update for a contractor. Silent if the current user has no
// contractor record.
export async function markContractorInviteAccepted(): Promise<{ ok: true }> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: true }

  await supabase
    .from('contractors')
    .update({ invite_accepted_at: new Date().toISOString() })
    .eq('auth_user_id', user.id)
    .is('invite_accepted_at', null)

  return { ok: true }
}
