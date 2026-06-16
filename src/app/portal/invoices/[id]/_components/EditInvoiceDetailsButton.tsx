'use client'

// Admin-edit Stage 3 — edit non-financial invoice details. Reason is
// required when the invoice has already been sent; saving never resends
// or touches totals / status / paid state.

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Pencil, X, Loader2, AlertTriangle } from 'lucide-react'
import clsx from 'clsx'
import { updateInvoiceDetails } from '../_actions-edit'

export interface InvoiceDetailValues {
  notes: string | null
  service_description: string | null
  service_address: string | null
  client_reference: string | null
  requires_po: boolean
  contact_name: string | null
  contact_email: string | null
  contact_phone: string | null
  accounts_contact_name: string | null
  accounts_email: string | null
  date_issued: string | null
  due_date: string | null
}

export function EditInvoiceDetailsButton({
  invoiceId,
  isSent,
  values,
}: {
  invoiceId: string
  isSent: boolean
  values: InvoiceDetailValues
}) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [v, setV] = useState<InvoiceDetailValues>(values)
  const [reason, setReason] = useState('')
  const [err, setErr] = useState<string | null>(null)
  const [ok, setOk] = useState(false)
  const [pending, startTransition] = useTransition()

  function set<K extends keyof InvoiceDetailValues>(k: K, val: InvoiceDetailValues[K]) {
    setV((p) => ({ ...p, [k]: val }))
  }

  function save() {
    setErr(null)
    if (isSent && !reason.trim()) { setErr('A reason is required to edit a sent invoice.'); return }
    startTransition(async () => {
      const res = await updateInvoiceDetails({
        invoiceId,
        ...v,
        date_issued: v.date_issued || null,
        due_date: v.due_date || null,
        reason: reason || null,
      })
      if ('error' in res) { setErr(res.error); return }
      setOk(true)
      router.refresh()
      setTimeout(() => { setOk(false); setOpen(false) }, 900)
    })
  }

  if (!open) {
    return (
      <button type="button" onClick={() => { setErr(null); setOk(false); setV(values); setOpen(true) }}
        className="inline-flex items-center gap-1.5 border border-sage-200 text-sage-700 font-medium px-3 py-1.5 rounded-lg text-xs hover:bg-sage-50 transition-colors">
        <Pencil size={13} /> Edit invoice details
      </button>
    )
  }

  const input = 'w-full rounded-lg border border-sage-200 px-3 py-2 text-sm text-sage-800 focus:outline-none focus:ring-2 focus:ring-sage-500'
  const text = (k: keyof InvoiceDetailValues, label: string, type = 'text') => (
    <label className="block">
      <span className="block text-[11px] font-medium text-sage-500 mb-1">{label}</span>
      <input type={type} value={(v[k] as string | null) ?? ''} onChange={(e) => set(k, e.target.value as never)} className={input} />
    </label>
  )

  return (
    <div className="mt-4 rounded-xl border border-sage-200 bg-sage-50/60 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-sage-800">Edit invoice details</span>
        <button type="button" onClick={() => setOpen(false)} className="text-sage-400 hover:text-sage-600" aria-label="Close"><X size={16} /></button>
      </div>

      {isSent && (
        <div className="flex items-start gap-2 text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
          <AlertTriangle size={14} className="mt-0.5 shrink-0" />
          This invoice has already been sent. Changes will be recorded, but the invoice will not be resent automatically.
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {text('contact_name', 'Primary contact')}
        {text('contact_email', 'Primary contact email', 'email')}
        {text('contact_phone', 'Primary contact phone', 'tel')}
        {text('accounts_contact_name', 'Accounts contact')}
        {text('accounts_email', 'Accounts email', 'email')}
        {text('client_reference', 'Client reference / PO')}
        {text('date_issued', 'Invoice date', 'date')}
        {text('due_date', 'Due date', 'date')}
        {text('service_address', 'Service address')}
      </div>

      <label className="block">
        <span className="block text-[11px] font-medium text-sage-500 mb-1">Service description</span>
        <textarea value={v.service_description ?? ''} onChange={(e) => set('service_description', e.target.value)} rows={2} className={clsx(input, 'resize-y')} />
      </label>
      <label className="block">
        <span className="block text-[11px] font-medium text-sage-500 mb-1">Invoice notes</span>
        <textarea value={v.notes ?? ''} onChange={(e) => set('notes', e.target.value)} rows={2} className={clsx(input, 'resize-y')} />
      </label>
      <label className="flex items-center gap-2 text-sm text-sage-700">
        <input type="checkbox" checked={v.requires_po} onChange={(e) => set('requires_po', e.target.checked)} className="rounded border-sage-300" />
        PO required
      </label>

      {isSent && (
        <label className="block">
          <span className="block text-[11px] font-medium text-sage-500 mb-1">Reason for change <span className="text-red-500">*</span></span>
          <input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. corrected PO number from client" className={input} />
        </label>
      )}

      {err && <p className="text-xs text-red-600">{err}</p>}
      {ok && <p className="text-xs text-emerald-700">Saved.</p>}

      <div className="flex items-center gap-2">
        <button type="button" onClick={save} disabled={pending}
          className="inline-flex items-center gap-1.5 bg-sage-500 text-white font-semibold px-4 py-2 rounded-lg text-sm hover:bg-sage-700 disabled:opacity-50">
          {pending ? <Loader2 size={14} className="animate-spin" /> : <Pencil size={14} />}
          {pending ? 'Saving…' : 'Save changes'}
        </button>
        <button type="button" onClick={() => { setOpen(false); setErr(null) }} className="text-sm text-sage-600 hover:text-sage-800">Cancel</button>
      </div>
    </div>
  )
}
