'use client'

import { useState, useTransition } from 'react'
import { sendQuoteEmail, sendQuoteTestEmail } from '../_actions'
import { Send, X, CheckCircle, FlaskConical, AlertTriangle } from 'lucide-react'

/**
 * Two clearly-separated send actions on one quote:
 *
 *  1. "Send test email"  → internal review copy to the logged-in staff
 *     member (default) or a typed internal address. Sends the SAME
 *     customer-facing PDF, but marks the email as a TEST and does NOT
 *     change the quote status, set sent_at, fork a version, or touch the
 *     customer recipient. Neutral outline styling.
 *
 *  2. "Send to customer" → the formal issue. Goes to the customer
 *     recipient, flips status to Sent, stamps sent_at, and (for a
 *     previously-sent quote being edited) triggers versioning. Sage
 *     solid styling + an explicit confirmation step so it can never be
 *     mistaken for the test action.
 */
export function SendQuotePanel({
  quoteId,
  quoteNumber,
  clientEmail,
  greeting,
  printUrl,
  staffEmail = '',
  // Phase 5D — universal billing fields. Quote routing rule:
  //   default to = primary contact email (falls back to client record email)
  //   optional CC = accounts email when present
  primaryContactEmail = '',
  accountsEmail = '',
  clientReference = '',
}: {
  quoteId: string
  quoteNumber: string
  clientEmail: string
  // Pre-resolved greeting line ("Hi Jamie," or "Hi there,") — greets the
  // contact person, never the company/account name. See lib/email-greeting.
  greeting: string
  printUrl: string
  /** Logged-in staff member's email — the default test recipient. */
  staffEmail?: string
  primaryContactEmail?: string
  accountsEmail?: string
  clientReference?: string
}) {
  const referenceLine = clientReference
    ? `\n\nYour reference: ${clientReference}`
    : ''
  const defaultTo = primaryContactEmail.trim() || clientEmail.trim()

  // panel: which of the two flows is open (null = collapsed buttons).
  const [panel, setPanel] = useState<null | 'test' | 'customer'>(null)

  // Customer-send fields.
  const [to, setTo] = useState(defaultTo)
  const [ccAccounts, setCcAccounts] = useState(false)
  const [subject, setSubject] = useState(`Quote ${quoteNumber} from Sano`)
  const [message, setMessage] = useState(
    `${greeting}\n\nPlease find your quote ${quoteNumber} from Sano via the link below.${referenceLine}\n\nIf you have any questions or would like to go ahead, just let us know.\n\nKind regards,\nThe Sano team`,
  )
  const [confirmCustomer, setConfirmCustomer] = useState(false)

  // Test-send field.
  const [testTo, setTestTo] = useState(staffEmail.trim())

  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState<null | { kind: 'test' | 'customer'; to: string }>(null)

  const accountsTrimmed = accountsEmail.trim()
  const showCcOption =
    accountsTrimmed.length > 0 && accountsTrimmed.toLowerCase() !== to.trim().toLowerCase()

  function reset() {
    setPanel(null)
    setError(null)
    setConfirmCustomer(false)
  }

  function handleTestSend() {
    setError(null)
    const recipient = testTo.trim() || staffEmail.trim()
    if (!recipient) {
      setError('Enter an internal email address for the test send.')
      return
    }
    startTransition(async () => {
      const result = await sendQuoteTestEmail({
        quote_id: quoteId,
        to: recipient,
        print_url: printUrl,
      })
      if (result?.error) {
        setError(result.error)
      } else {
        setDone({ kind: 'test', to: result?.recipient ?? recipient })
      }
    })
  }

  function handleCustomerSend() {
    setError(null)
    if (!to.trim()) {
      setError('Recipient email is required. Add a contact email or update the client record.')
      return
    }
    if (!confirmCustomer) {
      setError('Please confirm this quote will be recorded as issued to the customer.')
      return
    }
    const cc = ccAccounts && showCcOption ? [accountsTrimmed] : undefined
    startTransition(async () => {
      const result = await sendQuoteEmail({
        quote_id: quoteId,
        quote_number: quoteNumber,
        to: to.trim(),
        cc,
        subject,
        message,
        print_url: printUrl,
      })
      if (result?.error) {
        setError(result.error)
      } else {
        setDone({ kind: 'customer', to: to.trim() })
      }
    })
  }

  // ── Success states ──────────────────────────────────────────
  if (done?.kind === 'test') {
    return (
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
        <FlaskConical size={18} className="text-amber-600 shrink-0 mt-0.5" />
        <span className="text-sm text-amber-800">
          Test preview sent to <strong>{done.to}</strong>. The quote is <strong>still a draft</strong> — it has not been marked as sent to the customer.
        </span>
      </div>
    )
  }
  if (done?.kind === 'customer') {
    return (
      <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex items-center gap-3">
        <CheckCircle size={18} className="text-emerald-600 shrink-0" />
        <span className="text-sm text-emerald-700">
          Quote sent to <strong>{done.to}</strong>. Status updated to <strong>Sent</strong>.
        </span>
      </div>
    )
  }

  // ── Collapsed: two clearly different buttons ────────────────
  if (panel === null) {
    return (
      <div className="inline-flex items-center gap-2">
        <button
          type="button"
          onClick={() => { setPanel('test'); setError(null) }}
          className="inline-flex items-center gap-2 border border-sage-300 text-sage-700 bg-white font-medium px-4 py-2.5 rounded-lg text-sm hover:bg-sage-50 transition-colors"
        >
          <FlaskConical size={16} />
          Send test email
        </button>
        <button
          type="button"
          onClick={() => { setPanel('customer'); setError(null) }}
          className="inline-flex items-center gap-2 bg-sage-500 text-white font-semibold px-4 py-2.5 rounded-lg text-sm hover:bg-sage-700 transition-colors"
        >
          <Send size={16} />
          Send to customer
        </button>
      </div>
    )
  }

  // ── Test-send panel ─────────────────────────────────────────
  if (panel === 'test') {
    return (
      <div className="bg-white border border-amber-200 rounded-xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="inline-flex items-center gap-2 text-sm font-semibold text-amber-800">
            <FlaskConical size={16} /> Send test email
          </h3>
          <button type="button" onClick={reset} className="text-sage-400 hover:text-sage-600" aria-label="Close">
            <X size={16} />
          </button>
        </div>

        <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
          Send a copy to yourself for review. This will <strong>not</strong> mark the quote as sent, and the customer will not receive anything.
        </p>

        <label className="block">
          <span className="block text-sm font-semibold text-sage-800 mb-1.5">Send test to</span>
          <input
            type="email"
            value={testTo}
            onChange={(e) => setTestTo(e.target.value)}
            placeholder="you@sano.nz"
            className="w-full rounded-lg border border-sage-200 px-4 py-3 text-sage-800 placeholder:text-sage-300 focus:outline-none focus:ring-2 focus:ring-sage-500 focus:border-transparent text-sm"
          />
          <span className="block text-[11px] text-sage-500 mt-1">
            Defaults to your own email. The email is clearly marked “TEST – Quote preview – {quoteNumber}”.
          </span>
        </label>

        {error && <p className="text-red-600 text-sm bg-red-50 rounded-lg px-3 py-2">{error}</p>}

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleTestSend}
            disabled={isPending}
            className="inline-flex items-center gap-2 font-semibold px-5 py-2.5 rounded-lg text-sm transition-colors disabled:opacity-50 bg-amber-500 text-white hover:bg-amber-600"
          >
            <FlaskConical size={14} />
            {isPending ? 'Sending…' : 'Send test email'}
          </button>
          <button type="button" onClick={reset} className="text-sm text-sage-600 hover:text-sage-800">
            Cancel
          </button>
        </div>
      </div>
    )
  }

  // ── Customer-send panel ─────────────────────────────────────
  return (
    <div className="bg-white border border-sage-200 rounded-xl p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="inline-flex items-center gap-2 text-sm font-semibold text-sage-800">
          <Send size={16} /> Send to customer
        </h3>
        <button type="button" onClick={reset} className="text-sage-400 hover:text-sage-600" aria-label="Close">
          <X size={16} />
        </button>
      </div>

      {clientReference && (
        <div className="text-xs text-sage-600 bg-sage-50 rounded-lg px-3 py-2">
          Client reference / PO: <span className="font-medium text-sage-800">{clientReference}</span>
        </div>
      )}

      <label className="block">
        <span className="block text-sm font-semibold text-sage-800 mb-1.5">To</span>
        <input
          type="email"
          value={to}
          onChange={(e) => setTo(e.target.value)}
          placeholder="primary-contact@example.com"
          className="w-full rounded-lg border border-sage-200 px-4 py-3 text-sage-800 placeholder:text-sage-300 focus:outline-none focus:ring-2 focus:ring-sage-500 focus:border-transparent text-sm"
        />
        <span className="block text-[11px] text-sage-500 mt-1">
          Defaults to the primary contact for this quote.
        </span>
      </label>

      {showCcOption && (
        <label className="flex items-start gap-2.5 text-sm text-sage-800 cursor-pointer">
          <input
            type="checkbox"
            checked={ccAccounts}
            onChange={(e) => setCcAccounts(e.target.checked)}
            className="mt-0.5 h-4 w-4 rounded border-sage-300 text-sage-600 focus:ring-sage-500"
          />
          <span>
            CC accounts contact (<span className="font-medium">{accountsTrimmed}</span>)
          </span>
        </label>
      )}

      <label className="block">
        <span className="block text-sm font-semibold text-sage-800 mb-1.5">Subject</span>
        <input
          type="text"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          className="w-full rounded-lg border border-sage-200 px-4 py-3 text-sage-800 placeholder:text-sage-300 focus:outline-none focus:ring-2 focus:ring-sage-500 focus:border-transparent text-sm"
        />
      </label>

      <label className="block">
        <span className="block text-sm font-semibold text-sage-800 mb-1.5">Message</span>
        <textarea
          rows={6}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          className="w-full rounded-lg border border-sage-200 px-4 py-3 text-sage-800 placeholder:text-sage-300 focus:outline-none focus:ring-2 focus:ring-sage-500 focus:border-transparent text-sm resize-y"
        />
      </label>

      <label className="flex items-start gap-2.5 text-sm text-sage-800 cursor-pointer bg-sage-50 border border-sage-200 rounded-lg px-3 py-2.5">
        <input
          type="checkbox"
          checked={confirmCustomer}
          onChange={(e) => setConfirmCustomer(e.target.checked)}
          className="mt-0.5 h-4 w-4 rounded border-sage-300 text-sage-600 focus:ring-sage-500"
        />
        <span className="inline-flex items-start gap-1.5">
          <AlertTriangle size={15} className="text-sage-600 shrink-0 mt-0.5" />
          I confirm this quote will be <strong>recorded as issued to the customer</strong> and marked as Sent.
        </span>
      </label>

      {error && <p className="text-red-600 text-sm bg-red-50 rounded-lg px-3 py-2">{error}</p>}

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={handleCustomerSend}
          disabled={isPending || !confirmCustomer}
          className="inline-flex items-center gap-2 font-semibold px-5 py-2.5 rounded-lg text-sm transition-colors disabled:opacity-50 bg-sage-500 text-white hover:bg-sage-700"
        >
          <Send size={14} />
          {isPending ? 'Sending…' : 'Send to customer'}
        </button>
        <button type="button" onClick={reset} className="text-sm text-sage-600 hover:text-sage-800">
          Cancel
        </button>
      </div>
    </div>
  )
}
