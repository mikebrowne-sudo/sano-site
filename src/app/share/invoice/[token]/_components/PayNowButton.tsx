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
  kind = 'invoice',
}: {
  shareToken: string
  status: string
  datePaid: string | null
  paymentResult: string | null
  total: string
  /** 'quote' = pay an accepted quote upfront; the invoice follows marked paid. */
  kind?: 'invoice' | 'quote'
}) {
  const noun = kind === 'quote' ? 'booking' : 'invoice'
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (status === 'paid') {
    return (
      <div className="pay-panel pay-done">
        <CheckCircle size={32} className="pay-done-icon" />
        <p className="pay-done-title">Payment received</p>
        <p className="pay-done-sub">
          {datePaid ? `Paid on ${fmtDate(datePaid)}` : 'Thank you for your payment.'}
        </p>
      </div>
    )
  }

  if (paymentResult === 'success') {
    return (
      <div className="pay-panel pay-done">
        <CheckCircle size={32} className="pay-done-icon" />
        <p className="pay-done-title">Payment received — thank you</p>
        <p className="pay-done-sub">Your payment is being processed. The {noun} will update shortly.</p>
      </div>
    )
  }

  // Draft or cancelled invoice — don't show the pay card at all.
  if (status === 'draft' || status === 'cancelled') {
    return null
  }

  const cancelledMessage =
    paymentResult === 'cancelled' ? 'Payment was cancelled. You can try again below.' : null

  return (
    <div className="pay-panel">
      <h3 className="pay-title">{kind === 'quote' ? 'Pay for your booking' : 'Pay this invoice'}</h3>
      <p className="pay-sub">Secure payment powered by Stripe.</p>

      {cancelledMessage && <p className="pay-cancelled">{cancelledMessage}</p>}

      <div className="pay-amount-row">
        <span className="pay-amount-label">Amount due</span>
        <span className="pay-amount-value">{total}</span>
      </div>

      <PayButton
        kind={kind}
        shareToken={shareToken}
        total={total}
        loading={loading}
        setLoading={setLoading}
        error={error}
        setError={setError}
      />
    </div>
  )
}

function PayButton({ kind, shareToken, total, loading, setLoading, error, setError }: {
  kind: 'invoice' | 'quote'
  shareToken: string
  total: string
  loading: boolean
  setLoading: (v: boolean) => void
  error: string | null
  setError: (v: string | null) => void
}) {
  async function handlePay() {
    setError(null)
    setLoading(true)

    try {
      const res = await fetch('/api/stripe/create-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ share_token: shareToken, kind }),
      })

      const contentType = res.headers.get('content-type') ?? ''
      if (!contentType.includes('application/json')) {
        setError(`Server error (${res.status}). Please try again.`)
        setLoading(false)
        return
      }

      const data = await res.json()

      if (!res.ok || !data.url) {
        setError(data.error || `Failed to create payment session (${res.status})`)
        setLoading(false)
        return
      }

      window.location.href = data.url
    } catch (err) {
      setError(`Connection error: ${err instanceof Error ? err.message : 'Please try again.'}`)
      setLoading(false)
    }
  }

  return (
    <>
      <button onClick={handlePay} disabled={loading} className="pay-button">
        <CreditCard size={18} />
        {loading ? 'Redirecting to payment…' : `Pay ${total}`}
      </button>
      {error && <p className="pay-error">{error}</p>}
    </>
  )
}
