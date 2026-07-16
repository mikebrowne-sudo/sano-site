'use client'

// Phase 4 — staff tax-review panel on the contractor detail page.
// Shows the whole picture at a glance (structure, entity details, GST, whether
// an IR330C was requested + uploaded, whether the review is done) and lets
// staff move the review through its lifecycle. The next action is obvious.

import { useState, useTransition } from 'react'
import { Loader2, Check } from 'lucide-react'
import { setTaxReviewStatus } from '../_actions-tax-review'
import {
  TAX_REVIEW_STATUSES,
  taxReviewStatusLabel,
  taxReviewStatusTone,
  taxReviewGuidance,
  type TaxReviewStatus,
} from '@/lib/tax-review'
import { businessStructureLabel } from '@/lib/business-structure'

const TONE_BADGE: Record<string, string> = {
  neutral: 'bg-gray-100 text-gray-700',
  warn: 'bg-amber-50 text-amber-700',
  good: 'bg-emerald-100 text-emerald-800',
  bad: 'bg-red-50 text-red-700',
}

function YesNo({ value }: { value: boolean }) {
  return <span className={value ? 'text-emerald-700 font-medium' : 'text-sage-500'}>{value ? 'Yes' : 'No'}</span>
}

export function TaxReviewPanel({
  contractorId,
  structure,
  legalName,
  nzbn,
  companyNumber,
  gstRegistered,
  gstNumber,
  status,
  notes,
  ir330cRequested,
  ir330cUploaded,
  taxReviewComplete,
}: {
  contractorId: string
  structure: string | null
  legalName: string | null
  nzbn: string | null
  companyNumber: string | null
  gstRegistered: boolean
  gstNumber: string | null
  status: string | null
  notes: string | null
  ir330cRequested: boolean
  ir330cUploaded: boolean
  taxReviewComplete: boolean
}) {
  const [sel, setSel] = useState<TaxReviewStatus>((status as TaxReviewStatus) || 'review_required')
  const [note, setNote] = useState(notes ?? '')
  const [reqIr330c, setReqIr330c] = useState(ir330cRequested)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function save() {
    setError(null)
    setSaved(false)
    startTransition(async () => {
      const res = await setTaxReviewStatus({ contractorId, status: sel, notes: note, ir330cRequested: reqIr330c })
      if ('error' in res) { setError(res.error); return }
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    })
  }

  const currentTone = taxReviewStatusTone(status)
  const input = 'w-full rounded-lg border border-sage-200 px-3 py-2 text-sm text-sage-800 focus:outline-none focus:ring-2 focus:ring-sage-500'

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-medium ${TONE_BADGE[currentTone]}`}>
          {taxReviewStatusLabel(status)}
        </span>
        {taxReviewComplete && (
          <span className="inline-flex items-center gap-1 text-xs text-emerald-700"><Check size={13} /> tax_review checklist complete</span>
        )}
      </div>

      <p className="text-xs text-sage-500">{taxReviewGuidance(structure)}</p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 text-sm">
        <div className="flex justify-between border-b border-sage-50 py-1"><span className="text-sage-500">Structure</span><span className="text-sage-800 font-medium">{businessStructureLabel(structure) || '—'}</span></div>
        <div className="flex justify-between border-b border-sage-50 py-1"><span className="text-sage-500">Legal / entity name</span><span className="text-sage-800 font-medium">{legalName || '—'}</span></div>
        <div className="flex justify-between border-b border-sage-50 py-1"><span className="text-sage-500">NZBN</span><span className="text-sage-800 font-medium">{nzbn || '—'}</span></div>
        <div className="flex justify-between border-b border-sage-50 py-1"><span className="text-sage-500">Company number</span><span className="text-sage-800 font-medium">{companyNumber || '—'}</span></div>
        <div className="flex justify-between border-b border-sage-50 py-1"><span className="text-sage-500">GST</span><span className="text-sage-800 font-medium">{gstRegistered ? (gstNumber || 'Registered') : 'Not registered'}</span></div>
        <div className="flex justify-between border-b border-sage-50 py-1"><span className="text-sage-500">IR330C requested</span><YesNo value={ir330cRequested} /></div>
        <div className="flex justify-between border-b border-sage-50 py-1"><span className="text-sage-500">IR330C uploaded</span><YesNo value={ir330cUploaded} /></div>
        <div className="flex justify-between border-b border-sage-50 py-1"><span className="text-sage-500">Review complete</span><YesNo value={taxReviewComplete} /></div>
      </div>

      <div className="border-t border-sage-100 pt-4 space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <label className="flex flex-col gap-1">
            <span className="text-[11px] font-medium text-sage-500">Set review status</span>
            <select value={sel} onChange={(e) => setSel(e.target.value as TaxReviewStatus)} className={input}>
              {TAX_REVIEW_STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </label>
          <label className="flex items-end gap-2 pb-2">
            <input type="checkbox" checked={reqIr330c} onChange={(e) => setReqIr330c(e.target.checked)} className="rounded border-sage-300" />
            <span className="text-sm text-sage-700">IR330C requested</span>
          </label>
        </div>
        <label className="flex flex-col gap-1">
          <span className="text-[11px] font-medium text-sage-500">Notes / exception</span>
          <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} className={input} placeholder="Optional — record the tax decision or any exception" />
        </label>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <div className="flex items-center gap-3">
          <button type="button" onClick={save} disabled={isPending}
            className="inline-flex items-center gap-2 bg-sage-500 text-white font-semibold px-4 py-2 rounded-lg text-sm hover:bg-sage-700 disabled:opacity-50">
            {isPending ? <Loader2 size={14} className="animate-spin" /> : null}
            {isPending ? 'Saving…' : 'Save review'}
          </button>
          {saved && <span className="inline-flex items-center gap-1 text-sm text-emerald-700"><Check size={14} /> Saved</span>}
          <span className="text-[11px] text-sage-400">Confirmed / Not required completes the tax_review step.</span>
        </div>
      </div>
    </div>
  )
}
