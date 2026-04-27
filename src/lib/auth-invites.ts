// Phase 5.5.1 — Auth invite + reset orchestration.
//
// Wraps Supabase's `auth.admin.generateLink` so we mint the link
// server-side without triggering Supabase's default email, then send
// the actual email via Resend with our branded template. This keeps
// all transactional auth email content + styling under our control.
//
// All four functions use the service-role Supabase client and must
// run server-side only.

import { getServiceSupabase } from '@/lib/supabase-service'
import { sendInviteEmail, sendResetEmail } from '@/lib/resend'

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://sano.nz'

interface InviteResult {
  ok: true
  flow: 'invite' | 'recovery'
  /** Auth user id from the generated link's user payload, when
   *  available. Set on the invite path; on the recovery fallback
   *  path Supabase usually still returns the existing user. May be
   *  null if Supabase elects not to return it. */
  authUserId: string | null
}
interface AuthError {
  error: string
}

// Invite a new user. If the email already has an auth row, falls
// through to the recovery-link path so the same admin click doesn't
// fail surface-level — caller doesn't need to know which path ran.
export async function inviteUser(input: {
  email: string
  fullName: string
  redirectAfter?: 'portal' | 'contractor' | 'client'
}): Promise<InviteResult | AuthError> {
  const supabase = getServiceSupabase()
  const email = input.email.trim().toLowerCase()
  if (!email) return { error: 'Email is required.' }

  const redirectTo = `${SITE_URL}/portal/reset-password?invite=1`

  // Try the invite path first.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase.auth.admin as any).generateLink({
    type: 'invite',
    email,
    options: { redirectTo },
  })

  let actionLink: string | null = null
  let authUserId: string | null = null
  let flow: 'invite' | 'recovery' = 'invite'

  if (error) {
    // If the user already exists, Supabase returns an error like
    // "User already registered". Fall back to a recovery link so the
    // existing user can set a new password.
    const msg = error.message?.toLowerCase() ?? ''
    if (msg.includes('already') || msg.includes('exists')) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const recovery = await (supabase.auth.admin as any).generateLink({
        type: 'recovery',
        email,
        options: { redirectTo },
      })
      if (recovery.error) return { error: recovery.error.message }
      actionLink = recovery.data?.properties?.action_link ?? null
      authUserId = recovery.data?.user?.id ?? null
      flow = 'recovery'
    } else {
      return { error: error.message }
    }
  } else {
    actionLink = data?.properties?.action_link ?? null
    authUserId = data?.user?.id ?? null
  }

  if (!actionLink) return { error: 'Failed to generate invite link.' }

  try {
    await sendInviteEmail({
      to: email,
      name: input.fullName,
      link: actionLink,
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Email send failed.'
    return { error: `Invite link generated but email failed: ${msg}` }
  }

  return { ok: true, flow, authUserId }
}

// Public-form-driven password reset. Always returns ok:true — never
// leaks whether the email exists. If Supabase says the user is
// missing or rate-limited, we silently skip the send.
export async function requestPasswordReset(input: {
  email: string
}): Promise<{ ok: true } | AuthError> {
  const supabase = getServiceSupabase()
  const email = input.email.trim().toLowerCase()
  if (!email) return { error: 'Email is required.' }

  const redirectTo = `${SITE_URL}/portal/reset-password`

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase.auth.admin as any).generateLink({
    type: 'recovery',
    email,
    options: { redirectTo },
  })

  // Don't surface "user not found" to the caller — generic success.
  if (error) {
    const code = (error as { status?: number }).status
    if (code && code >= 500) {
      // Genuine server error — caller should retry.
      return { error: error.message }
    }
    return { ok: true }
  }

  const actionLink = data?.properties?.action_link as string | undefined
  if (!actionLink) return { ok: true }

  try {
    await sendResetEmail({
      to: email,
      // We don't have the user's name here without a separate lookup;
      // template handles a missing name gracefully.
      name: '',
      link: actionLink,
    })
  } catch {
    // Swallow email failure to keep the response generic.
  }

  return { ok: true }
}

// Soft-disable a portal user by setting a far-future ban window.
export async function disableAccess(input: {
  authUserId: string
}): Promise<{ ok: true } | AuthError> {
  const supabase = getServiceSupabase()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase.auth.admin as any).updateUserById(
    input.authUserId,
    { ban_duration: '8760h' }, // 365 days; admin can re-enable any time
  )
  if (error) return { error: error.message }
  return { ok: true }
}

export async function enableAccess(input: {
  authUserId: string
}): Promise<{ ok: true } | AuthError> {
  const supabase = getServiceSupabase()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase.auth.admin as any).updateUserById(
    input.authUserId,
    { ban_duration: 'none' },
  )
  if (error) return { error: error.message }
  return { ok: true }
}
