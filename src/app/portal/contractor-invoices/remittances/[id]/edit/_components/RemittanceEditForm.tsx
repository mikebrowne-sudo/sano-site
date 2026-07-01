'use client'

// Manual edit form for a remittance advice. Deliberately separate from
// the clean remittance view — this is the "fix the document to match the
// contractor" escape hatch, admin-only. Only descriptive fields are
// editable; amounts / hours / line membership are shown read-only so it's
// obvious the money isn't being touched.

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Save, AlertTriangle } from 'lucide-react'
import { updateRemittanceBatch } from '../../../../_actions-remittance-edit'
import { formatCurrency } from '@/lib/format'

interface EditLine {
  id: string
  kind: string
  contractorName: string | null
  jobNumber: string | null
  jobAddress: string | null
  note: string | null
  label: string | null
  hours: number | null
  amount: number
}

export interface RemittanceEditFormProps {
  id: string
  remittanceNumber: string
  wasSent: boolean
  header: {
    payeeLabel: string | null
    reference: string | null
    paymentDate: string | null
    notes: string | null
  }
  lines: EditLine[]
}

export function RemittanceEditForm(props: RemittanceEditFormProps) {
  const router = useRouter()
  const [payeeLabel, setPayeeLabel] = useState(props.header.payeeLabel ?? '')
  const [reference, setReference] = useState(props.header.reference ?? '')
  const [paymentDate, setPaymentDate] = useState(props.header.paymentDate ?? '')
  const [notes, setNotes] = useState(props.header.notes ?? '')
  const [lines, setLines] = useState<EditLine[]>(props.lines)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function patchLine(id: string, patch: Partial<EditLine>) {
    setLines((prev) => prev.map((l) => (l.id === id ? { ...l, ...patch } : l)))
  }

  function save() {
    setError(null)
    startTransition(async () => {
      const res = await updateRemittanceBatch({
        id: props.id,
        header: {
          payeeLabel: payeeLabel.trim() || null,
          reference: reference.trim() || null,
          paymentDate: paymentDate || null,
          notes: notes.trim() || null,
        },
        lines: lines.map((l) => ({
          id: l.id,
          jobNumber: l.jobNumber,
          jobAddress: l.jobAddress,
          note: l.note,
        })),
      })
      if (res?.error) {
        setError(res.error)
        return
      }
      router.push(`/portal/contractor-invoices/remittances/${props.id}`)
      router.refresh()
    })
  }

  const input =
    'rounded-lg border border-sage-200 px-3 py-2 text-sm text-sage-800 focus:outline-none focus:ring-2 focus:ring-sage-500 w-full'

  return (
    <div className="space-y-5">
      <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-xs text-amber-800 flex items-start gap-2">
        <AlertTriangle size={14} className="mt-0.5 shrink-0" />
        <span>
          Manual edit of the remittance <span className="font-semibold">document only</span>. This changes what the advice
          shows (addresses, labels, notes) — it does <span className="font-semibold">not</span> change any amount, the linked
          invoices, or their paid status.
          {props.wasSent && ' This remittance has already been sent — re-send or re-download after saving so the contractor gets the corrected copy.'}
        </span>
      </div>

      {/* Header fields */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
        <label className="flex flex-col gap-1">
          <span className="text-[11px] font-medium text-sage-500">Payee label</span>
          <input value={payeeLabel} onChange={(e) => setPayeeLabel(e.target.value)} placeholder="Contractor name" className={input} />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-[11px] font-medium text-sage-500">Bank / payment reference</span>
          <input value={reference} onChange={(e) => setReference(e.target.value)} className={input} />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-[11px] font-medium text-sage-500">Payment date</span>
          <input type="date" value={paymentDate} onChange={(e) => setPaymentDate(e.target.value)} className={input} />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-[11px] font-medium text-sage-500">Notes</span>
          <input value={notes} onChange={(e) => setNotes(e.target.value)} className={input} />
        </label>
      </div>

      {/* Lines */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
        <div className="text-xs font-semibold uppercase tracking-wide text-sage-500">Line addresses</div>
        {lines.map((l) => (
          <div key={l.id} className="border border-sage-100 rounded-xl p-4">
            <div className="flex items-center justify-between mb-3 text-sm">
              <span className="font-medium text-sage-800">
                {l.contractorName || 'Line'}
                {l.label ? ` · ${l.label}` : ''}
              </span>
              <span className="tnum text-sage-700">
                {l.hours != null ? <span className="text-sage-400 mr-2">{l.hours}h</span> : null}
                <span className="font-semibold">{formatCurrency(l.amount)}</span>
                <span className="ml-2 text-[10px] uppercase tracking-wide text-sage-400">locked</span>
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label className="flex flex-col gap-1">
                <span className="text-[11px] font-medium text-sage-500">Job number</span>
                <input value={l.jobNumber ?? ''} onChange={(e) => patchLine(l.id, { jobNumber: e.target.value })} className={input} />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-[11px] font-medium text-sage-500">Job address</span>
                <input value={l.jobAddress ?? ''} onChange={(e) => patchLine(l.id, { jobAddress: e.target.value })} placeholder="Address as the contractor listed it" className={input} />
              </label>
              <label className="flex flex-col gap-1 sm:col-span-2">
                <span className="text-[11px] font-medium text-sage-500">Note</span>
                <input value={l.note ?? ''} onChange={(e) => patchLine(l.id, { note: e.target.value })} className={input} />
              </label>
            </div>
          </div>
        ))}
        {lines.length === 0 && <p className="text-sm text-sage-500">This remittance has no line items.</p>}
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={save}
          disabled={isPending}
          className="inline-flex items-center gap-2 bg-sage-500 text-white font-semibold px-5 py-2.5 rounded-lg text-sm hover:bg-sage-700 disabled:opacity-50"
        >
          <Save size={15} />
          {isPending ? 'Saving…' : 'Save changes'}
        </button>
        <button
          type="button"
          onClick={() => router.push(`/portal/contractor-invoices/remittances/${props.id}`)}
          className="text-sm text-sage-500 hover:text-sage-700"
        >
          Cancel
        </button>
      </div>
    </div>
  )
}
