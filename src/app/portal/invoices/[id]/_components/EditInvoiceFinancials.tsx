'use client'

// Admin Full Edit Mode — Stage 3 UI. Edit invoice base price, add-on line
// items (label + amount, add / remove), discount and the GST flag, with a
// live recalculated total. Reason is required when the invoice has been
// sent or paid; saving never resends or changes status / paid state.

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Pencil, Plus, Trash2, X, Loader2, AlertTriangle } from 'lucide-react'
import clsx from 'clsx'
import { formatCurrency } from '@/lib/format'
import { updateInvoiceFinancials } from '../_actions-financials'

export interface InvoiceLine { label: string; description: string; price: string }

export function EditInvoiceFinancials({
  invoiceId,
  isSent,
  isPaid,
  basePrice,
  discount,
  gstIncluded,
  items,
}: {
  invoiceId: string
  isSent: boolean
  isPaid: boolean
  basePrice: number
  discount: number
  gstIncluded: boolean
  items: { label: string | null; description?: string | null; price: number | null }[]
}) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [base, setBase] = useState(String(basePrice ?? 0))
  const [disc, setDisc] = useState(String(discount ?? 0))
  const [gst, setGst] = useState(gstIncluded)
  const [lines, setLines] = useState<InvoiceLine[]>(items.map((i) => ({ label: i.label ?? '', description: i.description ?? '', price: String(i.price ?? 0) })))
  const [reason, setReason] = useState('')
  const [err, setErr] = useState<string | null>(null)
  const [ok, setOk] = useState(false)
  const [pending, startTransition] = useTransition()

  const requiresReason = isSent || isPaid
  const n = (s: string) => { const x = Number(s); return Number.isFinite(x) ? x : 0 }
  const total = Math.max(0, n(base) + lines.reduce((s, l) => s + n(l.price), 0) - n(disc))

  function save() {
    setErr(null)
    if (requiresReason && !reason.trim()) { setErr('A reason is required to edit a sent/paid invoice.'); return }
    startTransition(async () => {
      const res = await updateInvoiceFinancials({
        invoiceId,
        base_price: n(base),
        discount: n(disc),
        gst_included: gst,
        items: lines.map((l) => ({ label: l.label, description: l.description.trim() || null, price: n(l.price) })),
        reason: reason || null,
      })
      if ('error' in res) { setErr(res.error); return }
      setOk(true)
      router.refresh()
      setTimeout(() => { setOk(false); setOpen(false) }, 1000)
    })
  }

  if (!open) {
    return (
      <button type="button" onClick={() => { setErr(null); setOk(false); setOpen(true) }}
        className="mt-3 inline-flex items-center gap-1.5 border border-sage-200 text-sage-700 font-medium px-3 py-1.5 rounded-lg text-xs hover:bg-sage-50 transition-colors">
        <Pencil size={13} /> Edit pricing &amp; line items
      </button>
    )
  }

  const input = 'rounded-md border border-sage-200 px-2 py-1.5 text-sm text-sage-800 focus:outline-none focus:ring-2 focus:ring-sage-500'

  return (
    <div className="mt-3 rounded-xl border border-sage-200 bg-sage-50/60 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-sage-800">Edit pricing &amp; line items</span>
        <button type="button" onClick={() => setOpen(false)} className="text-sage-400 hover:text-sage-600" aria-label="Close"><X size={16} /></button>
      </div>

      {(isSent || isPaid) && (
        <div className="flex items-start gap-2 text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
          <AlertTriangle size={14} className="mt-0.5 shrink-0" />
          {isPaid
            ? 'This invoice is marked paid. Editing amounts may make the recorded invoice differ from payment history. No paid status will be changed automatically, and the invoice will not be resent.'
            : 'This invoice has already been sent. Changes will be audited and saved, but the invoice will not be resent automatically.'}
        </div>
      )}

      <label className="flex items-center justify-between gap-2 text-sm">
        <span className="text-sage-600">Base price</span>
        <input type="number" step="0.01" value={base} onChange={(e) => setBase(e.target.value)} className={clsx(input, 'w-32 text-right')} aria-label="Base price" />
      </label>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-sage-500">Line items</span>
          <button type="button" onClick={() => setLines((p) => [...p, { label: '', description: '', price: '' }])}
            className="inline-flex items-center gap-1 text-xs font-medium text-sage-600 hover:text-sage-800"><Plus size={13} /> Add line</button>
        </div>
        {lines.length === 0 && <p className="text-xs text-sage-400">No add-on lines.</p>}
        {lines.map((l, i) => (
          <div key={i} className="rounded-lg border border-sage-100 bg-sage-50/40 p-2 space-y-2">
            <div className="flex items-center gap-2">
              <input value={l.label} onChange={(e) => setLines((p) => p.map((x, j) => j === i ? { ...x, label: e.target.value } : x))} placeholder="Item name" className={clsx(input, 'flex-1')} aria-label={`Line ${i + 1} name`} />
              <input type="number" step="0.01" value={l.price} onChange={(e) => setLines((p) => p.map((x, j) => j === i ? { ...x, price: e.target.value } : x))} placeholder="0.00" className={clsx(input, 'w-28 text-right')} aria-label={`Line ${i + 1} amount`} />
              <button type="button" onClick={() => setLines((p) => p.filter((_, j) => j !== i))} className="text-sage-400 hover:text-red-600" aria-label={`Remove line ${i + 1}`}><Trash2 size={15} /></button>
            </div>
            <textarea rows={2} value={l.description} onChange={(e) => setLines((p) => p.map((x, j) => j === i ? { ...x, description: e.target.value } : x))} placeholder="Optional description" className={clsx(input, 'w-full resize-y')} aria-label={`Line ${i + 1} description`} />
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <label className="flex items-center justify-between gap-2 text-sm">
          <span className="text-sage-600">Discount</span>
          <input type="number" step="0.01" value={disc} onChange={(e) => setDisc(e.target.value)} className={clsx(input, 'w-28 text-right')} aria-label="Discount" />
        </label>
        <label className="flex items-center gap-2 text-sm text-sage-700">
          <input type="checkbox" checked={gst} onChange={(e) => setGst(e.target.checked)} className="rounded border-sage-300" /> GST inclusive
        </label>
      </div>

      <div className="flex items-center justify-between border-t border-sage-200 pt-2">
        <span className="font-semibold text-sage-800">New total{gst ? ' (GST incl.)' : ' (excl. GST)'}</span>
        <span className="text-lg font-bold text-sage-800">{formatCurrency(total)}</span>
      </div>

      {requiresReason && (
        <label className="block">
          <span className="block text-[11px] font-medium text-sage-500 mb-1">Reason for change <span className="text-red-500">*</span></span>
          <input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. agreed scope reduction with client" className={clsx(input, 'w-full')} />
        </label>
      )}

      {err && <p className="text-xs text-red-600">{err}</p>}
      {ok && <p className="text-xs text-emerald-700">Saved &amp; audited.</p>}

      <div className="flex items-center gap-2">
        <button type="button" onClick={save} disabled={pending}
          className="inline-flex items-center gap-1.5 bg-sage-500 text-white font-semibold px-4 py-2 rounded-lg text-sm hover:bg-sage-700 disabled:opacity-50">
          {pending ? <Loader2 size={14} className="animate-spin" /> : <Pencil size={14} />}
          {pending ? 'Saving…' : 'Save changes'}
        </button>
        <button type="button" onClick={() => { setOpen(false); setErr(null) }} className="text-sm text-sage-600 hover:text-sage-800">Cancel</button>
      </div>
      <p className="text-[11px] text-sage-400">Saving does not resend the invoice or change its paid status.</p>
    </div>
  )
}
