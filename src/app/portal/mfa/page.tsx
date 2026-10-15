'use client'

// Second sign-in step: enter the 6-digit code from the authenticator app.
// Reached via the middleware when a staff session is password-only (aal1)
// but the account has an authenticator set up.

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase-browser'
import { safeNextPath } from '@/lib/mfa-gate'
import { MfaShell, CodeInput } from './_components/MfaShell'

export default function MfaVerifyPage() {
  const router = useRouter()
  const [factorId, setFactorId] = useState<string | null>(null)
  const [code, setCode] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.mfa.listFactors().then(({ data, error: err }) => {
      if (err) { setError(err.message); return }
      const verified = data?.totp?.find((f) => f.status === 'verified')
      if (!verified) { router.replace('/portal/mfa/setup' + window.location.search); return }
      setFactorId(verified.id)
    })
  }, [router])

  async function verify(e: React.FormEvent) {
    e.preventDefault()
    if (!factorId || code.length !== 6) return
    setError(null)
    setLoading(true)
    const { error: err } = await createClient().auth.mfa.challengeAndVerify({ factorId, code })
    if (err) {
      setError("That code didn't work. Codes change every 30 seconds — try the current one.")
      setCode('')
      setLoading(false)
      return
    }
    router.push(safeNextPath(new URLSearchParams(window.location.search).get('next')))
    router.refresh()
  }

  return (
    <MfaShell title="Two-step sign-in">
      <form onSubmit={verify} className="space-y-5">
        <p className="text-sm text-sage-700">
          Open your authenticator app and enter the 6-digit code for <span className="font-semibold">Sano portal</span>.
        </p>
        <CodeInput value={code} onChange={setCode} />
        {error && <p className="text-red-600 text-sm bg-red-50 rounded-lg px-3 py-2">{error}</p>}
        <button
          type="submit"
          disabled={loading || !factorId || code.length !== 6}
          className="w-full bg-sage-500 text-white font-semibold py-3 rounded-lg hover:bg-sage-700 transition-colors disabled:opacity-50"
        >
          {loading ? 'Checking…' : 'Continue'}
        </button>
        <p className="text-xs text-sage-500">
          Lost your phone? Ask Mike to reset your two-step sign-in, then set it up again.
        </p>
      </form>
    </MfaShell>
  )
}
