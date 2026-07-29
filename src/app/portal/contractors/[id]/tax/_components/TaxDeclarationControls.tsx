'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Check, X, FilePlus } from 'lucide-react'
import { setDeclarationStatus, recordDeclaration, setScheduleTaxTreatment } from '../_actions'
import type { DeclarationType } from '@/lib/contractor-tax-declaration'

/** Verify / reject a submitted declaration. */
export function VerifyReject({ declarationId }: { declarationId: string }) {
  const router = useRouter()
  const [rejecting, setRejecting] = useState(false)
  const [notes, setNotes] = useState('')
  const [err, setErr] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function act(status: 'verified' | 'rejected') {
    setErr(null)
    startTransition(async () => {
      const res = await setDeclarationStatus(declarationId, status, notes.trim() || null)
      if (res.error) { setErr(res.error); return }
      setRejecting(false); router.refresh()
    })
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button type="button" onClick={() => act('verified')} disabled={isPending} className="inline-flex items-center gap-1.5 bg-emerald-600 text-white font-semibold px-3 py-1.5 rounded-lg text-sm hover:bg-emerald-700 disabled:opacity-50"><Check size={14} /> Verify</button>
      {!rejecting ? (
        <button type="button" onClick={() => setRejecting(true)} className="inline-flex items-center gap-1.5 border border-sage-200 text-sage-700 px-3 py-1.5 rounded-lg text-sm hover:bg-sage-50"><X size={14} /> Reject / request correction</button>
      ) : (
        <span className="inline-flex items-center gap-2">
          <input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Reason / correction note" className="rounded-lg border border-sage-200 px-2 py-1.5 text-sm w-56" />
          <button type="button" onClick={() => act('rejected')} disabled={isPending} className="text-sm bg-red-600 text-white px-3 py-1.5 rounded-lg disabled:opacity-50">Reject</button>
          <button type="button" onClick={() => setRejecting(false)} className="text-xs text-sage-500">cancel</button>
        </span>
      )}
      {err && <span className="text-xs text-red-600">{err}</span>}
    </div>
  )
}

const TYPES: { v: DeclarationType; l: string }[] = [
  { v: 'ir330c_standard', l: 'IR330C standard rate' },
  { v: 'contractor_chosen', l: 'Contractor-chosen rate' },
  { v: 'tailored_rate', l: 'Tailored rate (certificate)' },
  { v: 'exemption', l: 'Certificate of exemption' },
]

/** Record a staff-received paper IR330C / certificate (optionally verify now). */
export function RecordDeclaration({ contractorId }: { contractorId: string }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [type, setType] = useState<DeclarationType>('ir330c_standard')
  const [residency, setResidency] = useState('resident')
  const [rate, setRate] = useState('')
  const [activity, setActivity] = useState('')
  const [ird, setIrd] = useState('')
  const [certRef, setCertRef] = useState('')
  const [expiry, setExpiry] = useState('')
  const [verifyNow, setVerifyNow] = useState(true)
  const [err, setErr] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const input = 'rounded-lg border border-sage-200 px-3 py-2 text-sm w-full'
  const isExemption = type === 'exemption'
  const isTailored = type === 'tailored_rate'

  function save() {
    setErr(null)
    startTransition(async () => {
      const res = await recordDeclaration({
        contractorId,
        declarationType: type,
        residencyStatus: residency,
        withholdingRate: isExemption || rate === '' ? null : Number(rate),
        ir330cActivityNumber: activity || null,
        contractingIrdNumber: ird || null,
        tailoredRateCertificateRef: isTailored ? (certRef || null) : null,
        exemptionCertificateRef: isExemption ? (certRef || null) : null,
        expiryDate: (isExemption || isTailored) ? (expiry || null) : null,
        verifyNow,
      })
      if (res.error) { setErr(res.error); return }
      setOpen(false); router.refresh()
    })
  }

  if (!open) return <button type="button" onClick={() => setOpen(true)} className="inline-flex items-center gap-2 border border-sage-200 text-sage-700 font-medium px-4 py-2 rounded-lg text-sm hover:bg-sage-50"><FilePlus size={15} /> Record a declaration</button>

  return (
    <div className="bg-white border border-sage-200 rounded-2xl shadow-lg p-5 space-y-3">
      <p className="font-semibold text-sage-800">Record a contractor declaration</p>
      <p className="text-[11px] text-sage-400">Records a staff-received IR330C / certificate. Rates are decimals (0.20 = 20%). This supersedes any current declaration.</p>
      <div className="grid sm:grid-cols-2 gap-3">
        <label className="flex flex-col gap-1"><span className="text-[11px] text-sage-500">Type</span>
          <select className={input} value={type} onChange={(e) => setType(e.target.value as DeclarationType)}>{TYPES.map((t) => <option key={t.v} value={t.v}>{t.l}</option>)}</select></label>
        <label className="flex flex-col gap-1"><span className="text-[11px] text-sage-500">Residency</span>
          <select className={input} value={residency} onChange={(e) => setResidency(e.target.value)}><option value="resident">Resident</option><option value="non_resident">Non-resident</option></select></label>
        {!isExemption && <label className="flex flex-col gap-1"><span className="text-[11px] text-sage-500">Withholding rate (decimal)</span><input className={input} value={rate} onChange={(e) => setRate(e.target.value)} placeholder="0.20" /></label>}
        <label className="flex flex-col gap-1"><span className="text-[11px] text-sage-500">IR330C activity number</span><input className={input} value={activity} onChange={(e) => setActivity(e.target.value)} /></label>
        <label className="flex flex-col gap-1"><span className="text-[11px] text-sage-500">Contracting IRD number</span><input className={input} value={ird} onChange={(e) => setIrd(e.target.value)} /></label>
        {(isTailored || isExemption) && <label className="flex flex-col gap-1"><span className="text-[11px] text-sage-500">{isExemption ? 'Exemption' : 'Tailored-rate'} certificate ref</span><input className={input} value={certRef} onChange={(e) => setCertRef(e.target.value)} /></label>}
        {(isTailored || isExemption) && <label className="flex flex-col gap-1"><span className="text-[11px] text-sage-500">Certificate expiry</span><input type="date" className={input} value={expiry} onChange={(e) => setExpiry(e.target.value)} /></label>}
      </div>
      <label className="flex items-center gap-2 text-sm text-sage-700"><input type="checkbox" checked={verifyNow} onChange={(e) => setVerifyNow(e.target.checked)} /> Verify now (I have sighted the certificate)</label>
      {err && <p className="text-xs text-red-600">{err}</p>}
      <div className="flex justify-end gap-2">
        <button type="button" onClick={() => setOpen(false)} className="text-sm text-sage-600 px-3 py-2">Cancel</button>
        <button type="button" onClick={save} disabled={isPending} className="bg-sage-500 text-white font-semibold px-4 py-2 rounded-lg text-sm hover:bg-sage-700 disabled:opacity-50">{isPending ? 'Saving…' : 'Save'}</button>
      </div>
    </div>
  )
}

const TREATMENTS = [
  { v: 'schedular_payment', l: 'Schedular payment' },
  { v: 'ordinary_trade_creditor', l: 'Ordinary trade creditor' },
  { v: 'exempt_certificate', l: 'Exempt (certificate)' },
  { v: 'pending_review', l: 'Pending review' },
] as const

/** Per-schedule tax classification (staff-only). */
export function ScheduleTaxClassifier({ contractorId, scheduleId, current }: { contractorId: string; scheduleId: string; current: string | null }) {
  const router = useRouter()
  const [val, setVal] = useState(current ?? 'pending_review')
  const [err, setErr] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function save(next: string) {
    setVal(next); setErr(null)
    startTransition(async () => {
      const res = await setScheduleTaxTreatment(contractorId, scheduleId, next as 'schedular_payment', null)
      if (res.error) { setErr(res.error); return }
      router.refresh()
    })
  }

  return (
    <span className="inline-flex items-center gap-2">
      <select value={val} onChange={(e) => save(e.target.value)} disabled={isPending} className="rounded-lg border border-sage-200 px-2 py-1 text-xs">
        {TREATMENTS.map((t) => <option key={t.v} value={t.v}>{t.l}</option>)}
      </select>
      {err && <span className="text-xs text-red-600">{err}</span>}
    </span>
  )
}
