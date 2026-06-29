'use server'

import { createClient } from '@/lib/supabase-server'
import { isAdminUser, ACCOUNTANT_EMAILS } from '@/lib/is-admin'
import { inviteUser } from '@/lib/auth-invites'

const FINANCE_INVITE_SUBJECT = 'You’ve been given finance access to the Sano portal'

function nameFromEmail(email: string): string {
  const local = (email.split('@')[0] ?? '').replace(/[._-]+/g, ' ').trim()
  if (!local) return 'there'
  return local.charAt(0).toUpperCase() + local.slice(1)
}

/** Admin-only: send (or re-send) the branded, finance-tailored portal invite
 *  to one of the allowlisted accountant emails. Creates the auth user on first
 *  send; falls back to a recovery link if it already exists. */
export async function sendAccountantInvite(email: string): Promise<{ ok: boolean; error?: string }> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!isAdminUser(user)) return { ok: false, error: 'Not authorised.' }

  const target = email.trim().toLowerCase()
  if (!ACCOUNTANT_EMAILS.some((e) => e.toLowerCase() === target)) {
    return { ok: false, error: 'That email is not on the accountant list.' }
  }

  const res = await inviteUser({
    email: target,
    fullName: nameFromEmail(target),
    redirectAfter: 'portal',
    subjectOverride: FINANCE_INVITE_SUBJECT,
  })
  if ('error' in res) return { ok: false, error: res.error }
  return { ok: true }
}
