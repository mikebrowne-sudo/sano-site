'use server'

// Phase 5.5.6 — Client portal access actions.
//
// Mirrors the contractor invite flow from 5.5.3 with `clients` as the
// entity. Reuses the 5.5.1 inviteUser / disableAccess / enableAccess
// helpers. The reset-password page calls markClientInviteAccepted
// after a successful password set if the user matches a clients row.

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
async function writeAudit(supabase: any, userId: string, clientId: string, before: Record<string, unknown>, after: Record<string, unknown>, action: string) {
  await supabase.from('audit_log').insert({
    actor_id: userId,
    actor_role: 'admin',
    action,
    entity_table: 'clients',
    entity_id: clientId,
    before, after,
  })
}

export async function inviteClientUser(input: {
  clientId: string
}): Promise<{ ok: true; flow: 'invite' | 'recovery' } | { error: string }> {
  const supabase = createClient()
  const auth = await requireAdmin(supabase)
  if ('error' in auth) return auth

  const settings = await loadWorkforceSettings(supabase)
  if (!settings.enable_customer_portal) {
    return { error: 'Customer portal is disabled in workforce settings.' }
  }

  const { data: c } = await supabase
    .from('clients')
    .select('id, name, email, auth_user_id, access_disabled_at')
    .eq('id', input.clientId)
    .maybeSingle()
  if (!c) return { error: 'Client not found.' }
  const client = c as {
    id: string
    name: string
    email: string | null
    auth_user_id: string | null
    access_disabled_at: string | null
  }

  if (client.access_disabled_at) {
    return { error: 'Access is disabled. Re-enable before re-inviting.' }
  }
  if (!client.email?.trim()) {
    return { error: 'Client has no email on file.' }
  }

  const result = await inviteUser({
    email: client.email,
    fullName: client.name,
    redirectAfter: 'client',
  })
  if ('error' in result) return result

  const nowIso = new Date().toISOString()
  const updates: Record<string, unknown> = { invite_sent_at: nowIso }
  if (result.authUserId && !client.auth_user_id) {
    updates.auth_user_id = result.authUserId
  }

  await supabase.from('clients').update(updates).eq('id', input.clientId)

  await writeAudit(supabase, auth.user.id, input.clientId,
    { invite_sent_at: null, auth_user_id: client.auth_user_id },
    { invite_sent_at: nowIso, auth_user_id: result.authUserId ?? client.auth_user_id, flow: result.flow },
    'client.invite_sent',
  )

  revalidatePath('/portal/clients')
  revalidatePath(`/portal/clients/${input.clientId}`)
  return { ok: true, flow: result.flow }
}

// Resend is just a thin alias around invite — keeps the API explicit
// for callers and the audit log distinguishes via the action label.
export async function resendClientInvite(input: { clientId: string }) {
  return inviteClientUser(input)
}

export async function disableClientAccess(input: {
  clientId: string
  reason: string
}): Promise<{ ok: true } | { error: string }> {
  if (!input.reason.trim()) return { error: 'A reason is required.' }
  const supabase = createClient()
  const auth = await requireAdmin(supabase)
  if ('error' in auth) return auth

  const { data: c } = await supabase
    .from('clients')
    .select('id, auth_user_id, access_disabled_at')
    .eq('id', input.clientId)
    .maybeSingle()
  if (!c) return { error: 'Client not found.' }
  const client = c as { id: string; auth_user_id: string | null; access_disabled_at: string | null }

  if (client.auth_user_id) {
    const banResult = await disableAuthAccess({ authUserId: client.auth_user_id })
    if ('error' in banResult) return banResult
  }

  const nowIso = new Date().toISOString()
  const { error } = await supabase
    .from('clients')
    .update({
      access_disabled_at: nowIso,
      access_disabled_reason: input.reason.trim(),
    })
    .eq('id', input.clientId)
  if (error) return { error: error.message }

  await writeAudit(supabase, auth.user.id, input.clientId,
    { access_disabled_at: client.access_disabled_at },
    { access_disabled_at: nowIso, access_disabled_reason: input.reason.trim() },
    'client.access_disabled',
  )

  revalidatePath('/portal/clients')
  revalidatePath(`/portal/clients/${input.clientId}`)
  return { ok: true }
}

export async function enableClientAccess(input: {
  clientId: string
}): Promise<{ ok: true } | { error: string }> {
  const supabase = createClient()
  const auth = await requireAdmin(supabase)
  if ('error' in auth) return auth

  const { data: c } = await supabase
    .from('clients')
    .select('id, auth_user_id, access_disabled_at')
    .eq('id', input.clientId)
    .maybeSingle()
  if (!c) return { error: 'Client not found.' }
  const client = c as { id: string; auth_user_id: string | null; access_disabled_at: string | null }

  if (!client.access_disabled_at) {
    return { error: 'Access is not currently disabled.' }
  }

  if (client.auth_user_id) {
    const unbanResult = await enableAuthAccess({ authUserId: client.auth_user_id })
    if ('error' in unbanResult) return unbanResult
  }

  const { error } = await supabase
    .from('clients')
    .update({ access_disabled_at: null, access_disabled_reason: null })
    .eq('id', input.clientId)
  if (error) return { error: error.message }

  await writeAudit(supabase, auth.user.id, input.clientId,
    { access_disabled_at: client.access_disabled_at },
    { access_disabled_at: null },
    'client.access_enabled',
  )

  revalidatePath('/portal/clients')
  revalidatePath(`/portal/clients/${input.clientId}`)
  return { ok: true }
}

// Called from the reset-password page after a successful password
// update for a client. Silent if the current user has no client row.
export async function markClientInviteAccepted(): Promise<{ ok: true }> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: true }

  await supabase
    .from('clients')
    .update({ invite_accepted_at: new Date().toISOString() })
    .eq('auth_user_id', user.id)
    .is('invite_accepted_at', null)

  return { ok: true }
}
