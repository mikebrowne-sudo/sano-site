'use client'

import { useState } from 'react'
import { CheckCircle, CreditCard } from 'lucide-react'

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-NZ', { day: 'numeric', month: 'long', year: 'numeric' })
}

export function PayNowButton({
  shareToken,
  status,
  datePaid,
  paymentResult,
  total,
}: {
  shareToken: string
  status: string
  datePaid: string | null
  paymentResult: string | null
  total: string
}) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Already paid
  if (status === 'paid') {
    return (
      <div className="pay-panel pay-done">
        <CheckCircle size={24} className="pay-done-icon" />
        <div>
          <p className="pay-done-title">Payment received</p>
          <p className="pay-done-sub">{datePaid ? `Paid on ${fmtDate(datePaid)}` : 'Thank you for your payment.'}</p>
        </div>
      </div>
    )
  }

  // Just returned from successful payment
  if (paymentResult === 'success') {
    return (
      <div className="pay-panel pay-done">
        <CheckCircle size={24} className="pay-done-icon" />
        <div>
          <p className="pay-done-title">Payment received — thank you</p>
          <p className="pay-done-sub">Your payment is being processed. The invoice will update shortly.</p>
        </div>
      </div>
    )
  }

  // Cancelled payment
  if (paymentResult === 'cancelled') {
    return (
      <div className="pay-panel">
        <p className="pay-cancelled">Payment was cancelled. You can try again below.</p>
        <PayButton shareToken={shareToken} total={total} loading={loading} setLoading={setLoading} error={error} setError={setError} />
      </div>
    )
  }

  // Draft or cancelled invoice — don't show pay button
  if (status === 'draft' || status === 'cancelled') {
    return null
  }

  return (
    <div className="pay-panel">
      <PayButton shareToken={shareToken} total={total} loading={loading} setLoading={setLoading} error={error} setError={setError} />
    </div>
  )
}

function PayButton({ shareToken, total, loading, setLoading, error, setError }: {
  shareToken: string; total: string; loading: boolean; setLoading: (v: boolean) => void; error: string | null; setError: (v: string | null) => void
}) {
  async function handlePay() {
    setError(null)
    setLoading(true)

    try {
      const res = await fetch('/api/stripe/create-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ share_token: shareToken }),
      })

      const data = await res.json()

      if (!res.ok || !data.url) {
        setError(data.error || 'Failed to create payment session')
        setLoading(false)
        return
      }

      window.location.href = data.url
    } catch {
      setError('Something went wrong. Please try again.')
      setLoading(false)
    }
  }

  return (
    <>
      <button onClick={handlePay} disabled={loading} className="pay-button">
        <CreditCard size={18} />
        {loading ? 'Redirecting to payment…' : `Pay ${total}`}
      </button>
      <p className="pay-secure">Secure payment via Stripe</p>
      {error && <p className="pay-error">{error}</p>}
    </>
  )
}
