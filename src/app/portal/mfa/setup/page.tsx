'use client'

// One-time set-up of two-step sign-in (authenticator app / TOTP). Every
// staff-side login is sent here until they have a verified authenticator.

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase-browser'
import { safeNextPath } from '@/lib/mfa-gate'
import { MfaShell, CodeInput } from '../_components/MfaShell'

interface Enrolment {
  factorId: string
  qrCode: string
  secret: string
}

export default function MfaSetupPage() {
  const router = useRouter()
  const [enrolment, setEnrolment] = useState<Enrolment | null>(null)
  const [code, setCode] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const started = useRef(false)

  useEffect(() => {
    if (started.current) return
    started.current = true
    const supabase = createClient()
    ;(async () => {
      const { data: factors, error: listErr } = await supabase.auth.mfa.listFactors()
      if (listErr) { setError(listErr.message); return }
      // Already set up → this page isn't needed.
      if (factors?.totp?.some((f) => f.status === 'verified')) {
        router.replace('/portal/mfa' + window.location.search)
        return
      }
      // Clear half-finished attempts (e.g. a reload mid set-up) so they don't pile up.
      for (const f of factors?.all ?? []) {
        if (f.status === 'unverified') await supabase.auth.mfa.unenroll({ factorId: f.id })
      }
      const { data, error: enrollErr } = await supabase.auth.mfa.enroll({
        factorType: 'totp',
        friendlyName: `Sano portal ${new Date().toISOString().slice(0, 10)}`,
        issuer: 'Sano portal',
      })
      if (enrollErr || !data) { setError(enrollErr?.message ?? 'Could not start set-up.'); return }
      setEnrolment({ factorId: data.id, qrCode: data.totp.qr_code, secret: data.totp.secret })
    })()
  }, [router])

  async function confirm(e: React.FormEvent) {
    e.preventDefault()
    if (!enrolment || code.length !== 6) return
    setError(null)
    setLoading(true)
    const { error: err } = await createClient().auth.mfa.challengeAndVerify({ factorId: enrolment.factorId, code })
    if (err) {
      setError("That code didn't match. Check the app shows “Sano portal” and enter the current code.")
      setCode('')
      setLoading(false)
      return
    }
    router.push(safeNextPath(new URLSearchParams(window.location.search).get('next')))
    router.refresh()
  }

  return (
    <MfaShell title="Set up two-step sign-in">
      <form onSubmit={confirm} className="space-y-5">
        <ol className="text-sm text-sage-700 space-y-2 list-decimal pl-5">
          <li>Install an authenticator app on your phone (Google Authenticator, Microsoft Authenticator or 1Password).</li>
          <li>In the app, add an account and scan this code.</li>
          <li>Enter the 6-digit code the app shows.</li>
        </ol>

        {enrolment ? (
          <div className="flex flex-col items-center gap-2">
            {/* Supabase returns the QR as an SVG data URL. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={enrolment.qrCode} alt="QR code for your authenticator app" className="w-48 h-48" />
            <details className="text-xs text-sage-500 w-full">
              <summary className="cursor-pointer text-center">Can&apos;t scan? Enter this key instead</summary>
              <code className="block mt-2 break-all bg-sage-50 rounded px-2 py-1 text-sage-800">{enrolment.secret}</code>
            </details>
          </div>
        ) : (
          !error && <p className="text-sm text-sage-500 text-center">Preparing your code…</p>
        )}

        <CodeInput value={code} onChange={setCode} />
        {error && <p className="text-red-600 text-sm bg-red-50 rounded-lg px-3 py-2">{error}</p>}
        <button
          type="submit"
          disabled={loading || !enrolment || code.length !== 6}
          className="w-full bg-sage-500 text-white font-semibold py-3 rounded-lg hover:bg-sage-700 transition-colors disabled:opacity-50"
        >
          {loading ? 'Checking…' : 'Turn on two-step sign-in'}
        </button>
        <p className="text-xs text-sage-500">
          From now on you&apos;ll enter a code from this app each time you sign in to the portal.
        </p>
      </form>
    </MfaShell>
  )
}
