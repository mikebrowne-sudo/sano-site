'use client'

import { useState, useTransition } from 'react'
import { acceptQuote } from '../_actions'
import { CheckCircle } from 'lucide-react'

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-NZ', { day: 'numeric', month: 'long', year: 'numeric' })
}

export function AcceptQuote({
  shareToken,
  status,
  acceptedAt,
}: {
  shareToken: string
  status: string
  acceptedAt: string | null
}) {
  const [agreed, setAgreed] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [accepted, setAccepted] = useState(status === 'accepted')
  const [error, setError] = useState<string | null>(null)

  function handleAccept() {
    setError(null)
    startTransition(async () => {
      const result = await acceptQuote(shareToken)
      if (result?.error) {
        setError(result.error)
      } else {
        setAccepted(true)
      }
    })
  }

  // Already accepted
  if (accepted || status === 'accepted') {
    return (
      <div className="accept-panel accept-done">
        <CheckCircle size={24} className="accept-done-icon" />
        <div>
          <p className="accept-done-title">Quote accepted</p>
          <p className="accept-done-sub">
            {acceptedAt ? `Accepted on ${fmtDate(acceptedAt)}` : "Thanks, your quote has been accepted."}
          </p>
          <p className="accept-done-sub">We&apos;ll be in touch shortly to confirm next steps.</p>
        </div>
      </div>
    )
  }

  // Declined
  if (status === 'declined') {
    return null
  }

  return (
    <div className="accept-panel">
      <h3 className="accept-title">Accept this quote</h3>

      <label className="accept-checkbox-row">
        <input
          type="checkbox"
          checked={agreed}
          onChange={(e) => setAgreed(e.target.checked)}
          className="accept-checkbox"
        />
        <span>
          I agree to the{' '}
          <a href="/share/service-agreement" target="_blank" rel="noopener noreferrer" className="accept-link">
            Service Agreement
          </a>
        </span>
      </label>

      {error && <p className="accept-error">{error}</p>}

      <button
        onClick={handleAccept}
        disabled={!agreed || isPending}
        className="accept-button"
      >
        {isPending ? 'Accepting…' : 'Accept Quote'}
      </button>
    </div>
  )
}
