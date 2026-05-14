'use client'

// Phase 5.5.1 — Reset password form.
//
// State machine:
//   establishing → form     (token captured, session set, ready for input)
//                → expired  (no/invalid token; show "request a new link")
//   form         → submitting → success → (auto-redirect by role)
//                            → error    (back to form with message)
//
// Loading + success states are explicit per Phase 5.5.1 brief.

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase-browser'

type State =
  | 'establishing'
  | 'form'
  | 'expired'
  | 'submitting'
  | 'success'
  | 'error'

const REDIRECT_DELAY_MS = 1500
const MIN_PASSWORD = 8

export function ResetPasswordForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const isInvite = searchParams.get('invite') === '1'

  const [state, setState] = useState<State>('establishing')
  const [errorMessage, setErrorMessage] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [destLabel, setDestLabel] = useState<'portal' | 'contractor' | 'client'>('portal')

  // Establish the session from whatever Supabase put in the URL.
  //
  // Supabase's auth.admin.generateLink emits one of TWO formats
  // depending on the Supabase project's auth settings — not the client's
  // flowType:
  //   PKCE      → ?code=<code>           (must call exchangeCodeForSession)
  //   Implicit  → #access_token=...&refresh_token=...&type=recovery
  //                                       (must call setSession from the hash)
  //
  // The @supabase/ssr browser client doesn't auto-handle either case on
  // mount — that's only the OAuth-callback pattern. So we explicitly
  // detect both and handle whichever one shows up. Also handle the
  // `?error=...` / `#error=...` case Supabase returns when the token is
  // already used or genuinely expired.
  useEffect(() => {
    const supabase = createClient()
    let cancelled = false

    async function go() {
      const search = new URLSearchParams(window.location.search)
      const hashRaw = window.location.hash.startsWith('#')
        ? window.location.hash.slice(1)
        : window.location.hash
      const hashParams = new URLSearchParams(hashRaw)

      const code         = search.get('code')
      const accessToken  = hashParams.get('access_token')
      const refreshToken = hashParams.get('refresh_token')
      const urlError     = search.get('error') ?? hashParams.get('error')
      const urlErrorCode = search.get('error_code') ?? hashParams.get('error_code')

      // Safe diagnostic — structure-only. NO token, code, or full link
      // ever logged. Helps confirm which flow Supabase used in prod
      // and which branch we took on this load.
      console.warn('[reset-password] init', {
        hasCode: !!code,
        hasAccessToken: !!accessToken,
        hasRefreshToken: !!refreshToken,
        hasError: !!urlError,
        errorCode: urlErrorCode || undefined,
        invite: search.get('invite') === '1',
      })

      if (urlError) {
        setState('expired')
        return
      }

      let handled = false

      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code)
        if (cancelled) return
        if (error) {
          console.warn('[reset-password] exchangeCodeForSession failed', {
            name: error.name,
            message: error.message,
            status: (error as { status?: number }).status,
          })
          setState('expired')
          return
        }
        // Single-use; strip from URL so a refresh doesn't bounce to expired.
        const cleaned = new URL(window.location.href)
        cleaned.searchParams.delete('code')
        window.history.replaceState({}, '', cleaned.toString())
        handled = true
      } else if (accessToken && refreshToken) {
        const { error } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        })
        if (cancelled) return
        if (error) {
          console.warn('[reset-password] setSession failed', {
            name: error.name,
            message: error.message,
            status: (error as { status?: number }).status,
          })
          setState('expired')
          return
        }
        // Strip the hash so a refresh doesn't try to re-consume the tokens.
        window.history.replaceState({}, '', window.location.pathname + window.location.search)
        handled = true
      } else {
        // No tokens in URL — give Supabase's browser client a tick in
        // case it picked up something via its own detector. Likely a
        // no-op now but keeps the legacy path intact.
        await new Promise((r) => setTimeout(r, 50))
      }

      const { data: { user } } = await supabase.auth.getUser()
      if (cancelled) return
      if (!user) {
        if (!handled) {
          console.warn('[reset-password] no auth payload in URL and no existing session')
        }
        setState('expired')
        return
      }
      setState('form')
    }
    go()
    return () => { cancelled = true }
  }, [])

  function validate(): string | null {
    if (password.length < MIN_PASSWORD) return `Password must be at least ${MIN_PASSWORD} characters.`
    if (password !== confirm) return 'Passwords do not match.'
    return null
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    const err = validate()
    if (err) {
      setState('error')
      setErrorMessage(err)
      return
    }
    setState('submitting')
    setErrorMessage('')

    const supabase = createClient()
    const { error } = await supabase.auth.updateUser({ password })
    if (error) {
      setState('error')
      setErrorMessage(error.message)
      return
    }

    // Determine destination by role + mark invite-accepted on the
    // matching record. Role priority: contractor → client → staff.
    // The contractors / clients lookups are RLS-permitted self-reads
    // (auth_user_id = auth.uid()); staff is the catch-all.
    let dest: 'portal' | 'contractor' | 'client' = 'portal'
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: contractor } = await supabase
          .from('contractors')
          .select('id')
          .eq('auth_user_id', user.id)
          .maybeSingle()
        if (contractor) {
          dest = 'contractor'
          // Phase 5.5.3 — record invite acceptance on contractor records.
          const { markContractorInviteAccepted } = await import('@/app/portal/contractors/[id]/_actions-access')
          await markContractorInviteAccepted()
        } else {
          const { data: client } = await supabase
            .from('clients')
            .select('id')
            .eq('auth_user_id', user.id)
            .maybeSingle()
          if (client) {
            dest = 'client'
            // Phase 5.5.6 — record invite acceptance on client records.
            const { markClientInviteAccepted } = await import('@/app/portal/clients/[id]/_actions-access')
            await markClientInviteAccepted()
          } else {
            // Phase 5.5.2 — staff fallback. Silent if no staff row matches.
            const { markStaffInviteAccepted } = await import('@/app/portal/staff/_actions')
            await markStaffInviteAccepted()
          }
        }
      }
    } catch {
      // Fall through to portal default.
    }
    setDestLabel(dest)
    setState('success')
    setTimeout(() => {
      const target =
        dest === 'contractor' ? '/contractor/jobs' :
        dest === 'client'     ? '/client/dashboard' :
                                '/portal'
      router.push(target)
      router.refresh()
    }, REDIRECT_DELAY_MS)
  }

  // ── Render branches ─────────────────────────────────────────────

  if (state === 'establishing') {
    return (
      <div className="text-center py-6">
        <div className="inline-block w-6 h-6 border-2 border-sage-300 border-t-sage-700 rounded-full animate-spin mb-3" />
        <p className="text-sm text-sage-600">Verifying your link…</p>
      </div>
    )
  }

  if (state === 'expired') {
    return (
      <div className="text-center py-2">
        <p className="text-sm text-sage-800 font-medium mb-2">Link expired or invalid</p>
        <p className="text-xs text-sage-600 leading-relaxed mb-4">
          This password-reset link has expired or has already been used. Request a fresh one and we&apos;ll send a new link to your inbox.
        </p>
        <a
          href="/portal/forgot-password"
          className="inline-block bg-sage-500 text-white font-semibold px-5 py-2.5 rounded-lg text-sm hover:bg-sage-700 transition-colors"
        >
          Request a new link
        </a>
      </div>
    )
  }

  if (state === 'success') {
    return (
      <div className="text-center py-2">
        <div className="inline-flex w-10 h-10 items-center justify-center rounded-full bg-emerald-50 mb-3">
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
            <path d="M4 9.5L7.5 13L14 6" stroke="#3a7a6e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <p className="text-sm text-sage-800 font-medium mb-1">
          {isInvite ? 'Welcome to Sano' : 'Password updated'}
        </p>
        <p className="text-xs text-sage-600 leading-relaxed">
          Taking you to the {destLabel === 'contractor' ? 'contractor' : destLabel === 'client' ? 'client' : 'staff'} portal…
        </p>
      </div>
    )
  }

  // form / submitting / error all share the input UI
  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <p className="text-sm text-sage-600 -mt-2 mb-1">
        {isInvite
          ? 'Welcome — set a password to finish setting up your account.'
          : 'Choose a new password for your Sano portal account.'}
      </p>

      <div>
        <label htmlFor="password" className="block text-sm font-semibold text-sage-800 mb-1.5">New password</label>
        <input
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          autoComplete="new-password"
          autoFocus
          minLength={MIN_PASSWORD}
          className="w-full rounded-lg border border-sage-200 px-4 py-3 text-sage-800 placeholder:text-sage-200 focus:outline-none focus:ring-2 focus:ring-sage-500 focus:border-transparent"
          placeholder={`At least ${MIN_PASSWORD} characters`}
        />
      </div>

      <div>
        <label htmlFor="confirm" className="block text-sm font-semibold text-sage-800 mb-1.5">Confirm password</label>
        <input
          id="confirm"
          type="password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          required
          autoComplete="new-password"
          minLength={MIN_PASSWORD}
          className="w-full rounded-lg border border-sage-200 px-4 py-3 text-sage-800 placeholder:text-sage-200 focus:outline-none focus:ring-2 focus:ring-sage-500 focus:border-transparent"
          placeholder="Type it again"
        />
      </div>

      {state === 'error' && errorMessage && (
        <p className="text-red-600 text-sm bg-red-50 rounded-lg px-3 py-2">{errorMessage}</p>
      )}

      <button
        type="submit"
        disabled={state === 'submitting' || !password || !confirm}
        className="w-full bg-sage-500 text-white font-semibold py-3 rounded-lg hover:bg-sage-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {state === 'submitting' ? 'Saving…' : (isInvite ? 'Set password & continue' : 'Update password')}
      </button>
    </form>
  )
}
