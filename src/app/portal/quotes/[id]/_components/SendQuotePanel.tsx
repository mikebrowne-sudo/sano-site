'use client'

import { useState, useTransition } from 'react'
import { sendQuoteEmail } from '../_actions'
import { Send, X, CheckCircle } from 'lucide-react'
import clsx from 'clsx'

export function SendQuotePanel({
  quoteId,
  quoteNumber,
  clientEmail,
  clientName,
  printUrl,
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
  clientName: string
  printUrl: string
  primaryContactEmail?: string
  accountsEmail?: string
  clientReference?: string
}) {
  const greeting = clientName ? `Hi ${clientName},` : 'Hi there,'
  const referenceLine = clientReference
    ? `\n\nYour reference: ${clientReference}`
    : ''
  const defaultTo = primaryContactEmail.trim() || clientEmail.trim()
  const [open, setOpen] = useState(false)
  const [to, setTo] = useState(defaultTo)
  const [ccAccounts, setCcAccounts] = useState(false)
  const [subject, setSubject] = useState(`Quote ${quoteNumber} from Sano`)
  const [message, setMessage] = useState(
    `${greeting}\n\nPlease find your quote ${quoteNumber} from Sano via the link below.${referenceLine}\n\nIf you have any questions or would like to go ahead, just let us know.\n\nKind regards,\nThe Sano team`,
  )

  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [sent, setSent] = useState(false)

  const accountsTrimmed = accountsEmail.trim()
  const showCcOption =
    accountsTrimmed.length > 0 && accountsTrimmed.toLowerCase() !== to.trim().toLowerCase()

  function handleSend() {
    setError(null)

    if (!to.trim()) {
      setError('Recipient email is required. Add a contact email or update the client record.')
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
        setSent(true)
      }
    })
  }

  if (sent) {
    return (
      <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex items-center gap-3">
        <CheckCircle size={18} className="text-emerald-600 shrink-0" />
        <span className="text-sm text-emerald-700">
          Quote sent to <strong>{to}</strong>
          {ccAccounts && showCcOption && (
            <> · CC <strong>{accountsTrimmed}</strong></>
          )}
          . Status updated to sent.
        </span>
      </div>
    )
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 bg-sage-500 text-white font-medium px-4 py-2.5 rounded-lg text-sm hover:bg-sage-700 transition-colors"
      >
        <Send size={16} />
        Send Quote
      </button>
    )
  }

  return (
    <div className="bg-white border border-sage-200 rounded-xl p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-sage-800">Send Quote</h3>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="text-sage-400 hover:text-sage-600 transition-colors"
          aria-label="Close"
        >
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

      {error && (
        <p className="text-red-600 text-sm bg-red-50 rounded-lg px-3 py-2">{error}</p>
      )}

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={handleSend}
          disabled={isPending}
          className={clsx(
            'inline-flex items-center gap-2 font-semibold px-5 py-2.5 rounded-lg text-sm transition-colors disabled:opacity-50',
            'bg-sage-500 text-white hover:bg-sage-700',
          )}
        >
          <Send size={14} />
          {isPending ? 'Sending…' : 'Send'}
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="text-sm text-sage-600 hover:text-sage-800 transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  )
}
