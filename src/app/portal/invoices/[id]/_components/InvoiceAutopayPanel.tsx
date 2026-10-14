'use client'

// Direct debit status on an invoice for a customer on automatic payments.

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Landmark, Loader2, CheckCircle, AlertTriangle, Clock } from 'lucide-react'
import { collectInvoiceByDirectDebit } from '../_actions-autopay'

const fmt = (n: number) => new Intl.NumberFormat('en-NZ', { style: 'currency', currency: 'NZD' }).format(n)
const fmtDate = (iso: string) => new Date(iso).toLocaleDateString('en-NZ', { day: 'numeric', month: 'short', timeZone: 'Pacific/Auckland' })

export function InvoiceAutopayPanel({
  invoiceId, invoiceStatus, clientAutopay, debitStatus, debitError, requestedAt, amountDue,
}: {
  invoiceId: string
  invoiceStatus: string
  clientAutopay: string
  debitStatus: string | null
  debitError: string | null
  requestedAt: string | null
  amountDue: number
}) {
  const router = useRouter()
  const [err, setErr] = useState<string | null>(null)
  const [pending, start] = useTransition()

  function collect() {
    if (!window.confirm(`Collect ${fmt(amountDue)} from the customer's bank account by direct debit?`)) return
    setErr(null)
    start(async () => {
      const res = await collectInvoiceByDirectDebit(invoiceId)
      if ('error' in res) setErr(res.error)
      else router.refresh()
    })
  }

  const canCollect = clientAutopay === 'active' && invoiceStatus === 'sent' && amountDue > 0 && debitStatus !== 'processing'

  let body: React.ReactNode
  if (invoiceStatus === 'paid' && debitStatus === 'succeeded') {
    body = <p className="flex items-center gap-1.5 text-sm text-emerald-700"><CheckCircle size={14} /> Paid by direct debit.</p>
  } else if (debitStatus === 'processing') {
    body = <p className="flex items-center gap-1.5 text-sm text-sage-700"><Clock size={14} /> Direct debit requested{requestedAt ? ` on ${fmtDate(requestedAt)}` : ''}. It usually clears in 2–4 working days, then this invoice is marked paid automatically.</p>
  } else if (debitStatus === 'failed') {
    body = <p className="flex items-start gap-1.5 text-sm text-red-700"><AlertTriangle size={14} className="mt-0.5 shrink-0" /> The direct debit failed{debitError ? `: ${debitError}` : '.'}</p>
  } else if (clientAutopay === 'paused') {
    body = <p className="text-sm text-amber-700">Automatic payments are paused for this customer. Nothing will be collected until you resume them on the client page.</p>
  } else if (invoiceStatus === 'draft') {
    body = <p className="text-sm text-sage-600">This customer is on automatic payments. When you send this invoice, it&apos;s collected from their bank account automatically.</p>
  } else {
    body = <p className="text-sm text-sage-600">This customer is on automatic payments.</p>
  }

  return (
    <div className="mt-4 rounded-xl border border-sage-100 bg-white p-4">
      <div className="flex items-center gap-2">
        <Landmark size={15} className="text-sage-500" />
        <span className="text-sm font-semibold text-sage-800">Direct debit</span>
      </div>
      <div className="mt-2">{body}</div>
      {canCollect && (
        <button type="button" onClick={collect} disabled={pending}
          className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-sage-500 px-3 py-1.5 text-sm font-semibold text-white hover:bg-sage-700 disabled:opacity-50">
          {pending ? <Loader2 size={14} className="animate-spin" /> : <Landmark size={14} />}
          {debitStatus === 'failed' ? `Try again: collect ${fmt(amountDue)}` : `Collect ${fmt(amountDue)} by direct debit`}
        </button>
      )}
      {err && <p className="mt-2 text-sm text-red-600">{err}</p>}
    </div>
  )
}
