'use client'

import { useState } from 'react'

export function ForgotPasswordForm() {
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<'idle' | 'submitting' | 'sent' | 'error'>('idle')
  const [errorMessage, setErrorMessage] = useState('')

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setStatus('submitting')
    setErrorMessage('')
    try {
      const res = await fetch('/api/auth/reset-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      })
      if (!res.ok && res.status >= 500) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || 'Service unavailable')
      }
      // Generic success regardless of whether the email exists.
      setStatus('sent')
    } catch (err) {
      setStatus('error')
      setErrorMessage(err instanceof Error ? err.message : 'Something went wrong.')
    }
  }

  if (status === 'sent') {
    return (
      <div className="text-center py-2">
        <div className="inline-flex w-10 h-10 items-center justify-center rounded-full bg-emerald-50 mb-3">
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
            <path d="M4 9.5L7.5 13L14 6" stroke="#3a7a6e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <p className="text-sm text-sage-800 font-medium mb-1">Check your inbox</p>
        <p className="text-xs text-sage-600 leading-relaxed">
          If an account matches that email, we&apos;ve sent a password-reset link. The link is valid for 24 hours.
        </p>
      </div>
    )
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <p className="text-sm text-sage-600 -mt-2 mb-1">
        Enter your email and we&apos;ll send a link to reset your password.
      </p>
      <div>
        <label htmlFor="email" className="block text-sm font-semibold text-sage-800 mb-1.5">Email</label>
        <input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          autoComplete="email"
          autoFocus
          className="w-full rounded-lg border border-sage-200 px-4 py-3 text-sage-800 placeholder:text-sage-200 focus:outline-none focus:ring-2 focus:ring-sage-500 focus:border-transparent"
          placeholder="you@example.com"
        />
      </div>
      {status === 'error' && errorMessage && (
        <p className="text-red-600 text-sm bg-red-50 rounded-lg px-3 py-2">{errorMessage}</p>
      )}
      <button
        type="submit"
        disabled={status === 'submitting' || !email.trim()}
        className="w-full bg-sage-500 text-white font-semibold py-3 rounded-lg hover:bg-sage-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {status === 'submitting' ? 'Sending…' : 'Send reset link'}
      </button>
    </form>
  )
}
