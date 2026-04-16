'use client'

import { useState, useTransition } from 'react'
import { sendInvoiceEmail } from '../_actions'
import { Send, X, CheckCircle } from 'lucide-react'
import clsx from 'clsx'

export function SendInvoicePanel({
  invoiceId,
  invoiceNumber,
  clientEmail,
  printUrl,
}: {
  invoiceId: string
  invoiceNumber: string
  clientEmail: string
  printUrl: string
}) {
  const [open, setOpen] = useState(false)
  const [to, setTo] = useState(clientEmail)
  const [subject, setSubject] = useState(`Invoice ${invoiceNumber} from Sano`)
  const [message, setMessage] = useState(
    `Hi,\n\nPlease find your invoice ${invoiceNumber} from Sano via the link below.\n\nPayment details are included on the invoice. If you have any questions, just let us know.\n\nKind regards,\nThe Sano team`,
  )

  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [sent, setSent] = useState(false)

  function handleSend() {
    setError(null)

    if (!to.trim()) {
      setError('Client email is required. Add an email to the client record first.')
      return
    }

    startTransition(async () => {
      const result = await sendInvoiceEmail({
        invoice_id: invoiceId,
        invoice_number: invoiceNumber,
        to: to.trim(),
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
          Invoice sent to <strong>{to}</strong>. Status updated to sent.
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
        Send Invoice
      </button>
    )
  }

  return (
    <div className="bg-white border border-sage-200 rounded-xl p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-sage-800">Send Invoice</h3>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="text-sage-400 hover:text-sage-600 transition-colors"
          aria-label="Close"
        >
          <X size={16} />
        </button>
      </div>

      <label className="block">
        <span className="block text-sm font-semibold text-sage-800 mb-1.5">To</span>
        <input
          type="email"
          value={to}
          onChange={(e) => setTo(e.target.value)}
          placeholder="client@example.com"
          className="w-full rounded-lg border border-sage-200 px-4 py-3 text-sage-800 placeholder:text-sage-300 focus:outline-none focus:ring-2 focus:ring-sage-500 focus:border-transparent text-sm"
        />
      </label>

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
