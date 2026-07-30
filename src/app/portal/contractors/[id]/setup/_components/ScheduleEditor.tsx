'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Save, X } from 'lucide-react'
import { formatCurrency } from '@/lib/format'
import { previewSchedulePayment, periodTotals, type PaymentMethod, type PaymentBasis, type RateBasis } from '@/lib/contractor-schedule-preview'
import { upsertServiceSchedule, type ScheduleInput } from '../_actions'
import type { ServiceSchedule } from '@/lib/contractor-setup-data'

const METHODS: { v: PaymentMethod; l: string }[] = [
  { v: 'hourly', l: 'Hourly rate' }, { v: 'fixed_per_clean', l: 'Fixed per clean' },
  { v: 'fixed_weekly', l: 'Fixed weekly' }, { v: 'fixed_fortnightly', l: 'Fixed fortnightly' },
  { v: 'fixed_monthly', l: 'Fixed monthly' }, { v: 'project', l: 'Project amount' }, { v: 'custom', l: 'Custom' },
]

/** Add/edit a service schedule with a live payment preview. `schedular` and the
 *  verified withholding rate come from the contractor's (later-PR) tax status;
 *  in PR 1 the rate is passed as null when schedular, so the preview shows
 *  "pending" and never guesses. */
export function ScheduleEditor({ contractorId, schedular, whtRate, existing, clients = [] }: {
  contractorId: string
  schedular: boolean
  whtRate: number | null
  existing?: ServiceSchedule
  /** Selectable customers/clients for the Customer field. Empty is tolerated
   *  (the field just shows "— None —"). */
  clients?: { id: string; name: string }[]
}) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const [f, setF] = useState<ScheduleInput>(() => existing ? {
    id: existing.id, name: existing.name, customerClientId: existing.customerClientId, serviceAddress: existing.serviceAddress, classification: existing.classification,
    serviceType: existing.serviceType, workDescription: existing.workDescription, startDate: existing.startDate,
    term: existing.term, frequency: existing.frequency, expectedUnits: existing.expectedUnits,
    paymentMethod: existing.paymentMethod, paymentBasis: existing.paymentBasis, rateBasis: existing.rateBasis,
    agreedAmount: existing.agreedAmount, paymentFrequency: existing.paymentFrequency, noticePeriod: existing.noticePeriod,
    paymentReference: existing.paymentReference, costCentre: existing.costCentre, status: existing.status as ScheduleInput['status'],
  } : { name: '', paymentBasis: 'gross_fee', rateBasis: 'gst_exclusive', classification: 'commercial' })

  const preview = previewSchedulePayment({
    paymentBasis: (f.paymentBasis as PaymentBasis) || 'gross_fee',
    rateBasis: (f.rateBasis as RateBasis) || 'gst_exclusive',
    agreedAmount: Number(f.agreedAmount || 0),
    gstApplies: false, // GST verification is a later PR; preview stays conservative
    whtRate: schedular ? whtRate : 0,
    schedular,
  })
  const totals = periodTotals((f.paymentMethod as PaymentMethod) || 'custom', Number(f.agreedAmount || 0))

  function set<K extends keyof ScheduleInput>(k: K, v: ScheduleInput[K]) { setF((p) => ({ ...p, [k]: v })); setErr(null) }

  function save() {
    setErr(null)
    startTransition(async () => {
      const res = await upsertServiceSchedule(contractorId, f)
      if (res.error) { setErr(res.error); return }
      setOpen(false)
      router.refresh()
    })
  }

  const input = 'rounded-lg border border-sage-200 px-3 py-2 text-sm text-sage-800 focus:outline-none focus:ring-2 focus:ring-sage-500 w-full'
  const isNet = f.paymentBasis === 'guaranteed_net'

  if (!open) {
    return existing ? (
      <button type="button" onClick={() => setOpen(true)} className="text-sage-600 hover:text-sage-800 underline text-sm">Edit</button>
    ) : (
      <button type="button" onClick={() => setOpen(true)} className="inline-flex items-center gap-2 bg-sage-500 text-white font-semibold px-4 py-2 rounded-lg text-sm hover:bg-sage-700">
        <Plus size={15} /> Add service schedule
      </button>
    )
  }

  return (
    <div className="bg-white border border-sage-200 rounded-2xl shadow-lg p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="font-semibold text-sage-800">{existing ? 'Edit' : 'New'} service schedule</h4>
        <button type="button" onClick={() => setOpen(false)} className="text-sage-400 hover:text-sage-600"><X size={16} /></button>
      </div>

      <div className="grid sm:grid-cols-2 gap-3">
        <label className="flex flex-col gap-1"><span className="text-[11px] font-medium text-sage-500">Arrangement name *</span>
          <input className={input} value={f.name ?? ''} onChange={(e) => set('name', e.target.value)} placeholder="e.g. Pukekohe Golf Club commercial cleaning" /></label>
        <label className="flex flex-col gap-1"><span className="text-[11px] font-medium text-sage-500">Customer</span>
          <select className={input} value={f.customerClientId ?? ''} onChange={(e) => set('customerClientId', e.target.value || null)}>
            <option value="">— None —</option>
            {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <span className="text-[10px] text-sage-400">The client this arrangement is for (e.g. Pukekohe Golf Club). Appears on the agreement schedule block.</span></label>
        <label className="flex flex-col gap-1"><span className="text-[11px] font-medium text-sage-500">Service type</span>
          <input className={input} value={f.serviceType ?? ''} onChange={(e) => set('serviceType', e.target.value)} placeholder="commercial cleaning" /></label>
        <label className="flex flex-col gap-1"><span className="text-[11px] font-medium text-sage-500">Classification</span>
          <select className={input} value={f.classification ?? ''} onChange={(e) => set('classification', e.target.value as ScheduleInput['classification'])}>
            <option value="commercial">Commercial</option><option value="residential">Residential</option></select></label>
        <label className="flex flex-col gap-1"><span className="text-[11px] font-medium text-sage-500">Service address</span>
          <input className={input} value={f.serviceAddress ?? ''} onChange={(e) => set('serviceAddress', e.target.value)} /></label>
        <label className="flex flex-col gap-1"><span className="text-[11px] font-medium text-sage-500">Term</span>
          <select className={input} value={f.term ?? ''} onChange={(e) => set('term', e.target.value as ScheduleInput['term'])}>
            <option value="">—</option><option value="ongoing">Ongoing</option><option value="fixed">Fixed term</option></select></label>
        <label className="flex flex-col gap-1"><span className="text-[11px] font-medium text-sage-500">Frequency</span>
          <input className={input} value={f.frequency ?? ''} onChange={(e) => set('frequency', e.target.value)} placeholder="e.g. weekly, monthly" /></label>
      </div>

      <div className="border-t border-sage-100 pt-4 grid sm:grid-cols-3 gap-3">
        <label className="flex flex-col gap-1"><span className="text-[11px] font-medium text-sage-500">Payment method</span>
          <select className={input} value={f.paymentMethod ?? ''} onChange={(e) => set('paymentMethod', e.target.value)}>
            <option value="">—</option>{METHODS.map((m) => <option key={m.v} value={m.v}>{m.l}</option>)}</select></label>
        <label className="flex flex-col gap-1"><span className="text-[11px] font-medium text-sage-500">Payment basis</span>
          <select className={input} value={f.paymentBasis ?? 'gross_fee'} onChange={(e) => set('paymentBasis', e.target.value)}>
            <option value="gross_fee">Gross fee (before withholding)</option>
            <option value="guaranteed_net">Guaranteed net (contractor receives)</option></select></label>
        <label className="flex flex-col gap-1"><span className="text-[11px] font-medium text-sage-500">GST rate basis</span>
          <select className={input} value={f.rateBasis ?? 'gst_exclusive'} onChange={(e) => set('rateBasis', e.target.value)}>
            <option value="gst_exclusive">GST exclusive</option><option value="gst_inclusive">GST inclusive</option></select></label>
        <label className="flex flex-col gap-1"><span className="text-[11px] font-medium text-sage-500">{isNet ? 'Amount contractor receives' : 'Agreed amount'}</span>
          <input type="number" step="0.01" className={input} value={f.agreedAmount ?? ''} onChange={(e) => set('agreedAmount', e.target.value === '' ? null : Number(e.target.value))} /></label>
        <label className="flex flex-col gap-1"><span className="text-[11px] font-medium text-sage-500">Payment reference</span>
          <input className={input} value={f.paymentReference ?? ''} onChange={(e) => set('paymentReference', e.target.value)} /></label>
        <label className="flex flex-col gap-1"><span className="text-[11px] font-medium text-sage-500">Cost centre</span>
          <input className={input} value={f.costCentre ?? ''} onChange={(e) => set('costCentre', e.target.value)} /></label>
      </div>

      {/* Live payment preview */}
      <div className="bg-sage-50/60 border border-sage-100 rounded-xl p-4 text-sm">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-sage-500 mb-2">Payment preview</p>
        {preview.pending ? (
          <div className="space-y-0.5 text-sage-600">
            {isNet && <Row k="Contractor receives" v={formatCurrency(Number(f.agreedAmount || 0))} />}
            <Row k="Withholding rate" v="pending verified IR330C" amber />
            <Row k="Final Sano cost" v="pending tax declaration" amber />
          </div>
        ) : (
          <div className="space-y-0.5 text-sage-700">
            {isNet && <Row k="Contractor receives (net)" v={formatCurrency(preview.netBank ?? 0)} />}
            <Row k="Gross ex-GST fee" v={formatCurrency(preview.grossExGst ?? 0)} />
            <Row k="GST" v={formatCurrency(preview.gst ?? 0)} />
            {schedular && <Row k={`Withholding${preview.whtRate != null ? ` @ ${Math.round((preview.whtRate) * 100)}%` : ''}`} v={formatCurrency(preview.whtAmount ?? 0)} />}
            {!isNet && <Row k="Net bank payment" v={formatCurrency(preview.netBank ?? 0)} />}
            <Row k="Total cost to Sano" v={formatCurrency(preview.sanoCost ?? 0)} bold />
            {totals.monthly != null && <Row k="Monthly / annual" v={`${formatCurrency(totals.monthly)} / ${formatCurrency(totals.annual ?? 0)}`} />}
          </div>
        )}
      </div>

      {err && <p className="text-xs text-red-600">{err}</p>}
      <div className="flex justify-end gap-2">
        <button type="button" onClick={() => setOpen(false)} className="text-sm text-sage-600 px-3 py-2">Cancel</button>
        <button type="button" onClick={save} disabled={isPending} className="inline-flex items-center gap-2 bg-sage-500 text-white font-semibold px-4 py-2 rounded-lg text-sm hover:bg-sage-700 disabled:opacity-50">
          <Save size={15} /> {isPending ? 'Saving…' : 'Save schedule'}
        </button>
      </div>
    </div>
  )
}

function Row({ k, v, bold, amber }: { k: string; v: string; bold?: boolean; amber?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className={amber ? 'text-amber-700' : ''}>{k}</span>
      <span className={clsxNum(bold, amber)}>{v}</span>
    </div>
  )
}
function clsxNum(bold?: boolean, amber?: boolean) {
  return ['tabular-nums', bold ? 'font-bold text-sage-800' : '', amber ? 'text-amber-700 font-medium' : ''].filter(Boolean).join(' ')
}
