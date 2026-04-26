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
  const [destLabel, setDestLabel] = useState<'portal' | 'contractor'>('portal')

  // Capture the recovery token from the URL hash and set the session
  // on mount. Supabase's createBrowserClient auto-detects the hash
  // for us, so this is mostly a confirmation step.
  useEffect(() => {
    const supabase = createClient()
    let cancelled = false

    async function go() {
      // Give Supabase a tick to process the hash.
      await new Promise((r) => setTimeout(r, 50))
      const { data: { user } } = await supabase.auth.getUser()
      if (cancelled) return
      if (!user) {
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

    // Determine destination by role.
    let dest: 'portal' | 'contractor' = 'portal'
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data } = await supabase
          .from('contractors')
          .select('id')
          .eq('auth_user_id', user.id)
          .maybeSingle()
        if (data) dest = 'contractor'
      }
    } catch {
      // Fall through to portal default.
    }
    setDestLabel(dest)
    setState('success')
    setTimeout(() => {
      router.push(dest === 'contractor' ? '/contractor/jobs' : '/portal')
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
          Taking you to the {destLabel === 'contractor' ? 'contractor' : 'staff'} portal…
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
