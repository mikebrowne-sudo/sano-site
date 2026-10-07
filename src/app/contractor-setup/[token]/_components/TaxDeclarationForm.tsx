'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Check } from 'lucide-react'
import { submitContractorDeclaration } from '../_tax-actions'
import { CONTRACTOR_DECLARATION_TEXT, type DeclarationType } from '@/lib/contractor-tax-declaration'
import type { ContractorSafeDeclaration } from '@/lib/contractor-tax-declaration-data'

const TYPES: { v: DeclarationType; l: string }[] = [
  { v: 'ir330c_standard', l: 'IR330C standard rate' },
  { v: 'contractor_chosen', l: 'I am choosing my own rate' },
  { v: 'tailored_rate', l: 'I have a tailored-rate certificate' },
  { v: 'exemption', l: 'I have a certificate of exemption' },
]

/** Contractor-facing IR330C declaration. Submits a PENDING declaration for Sano
 *  to review — never auto-verified. Only contractor-safe fields; the contractor
 *  cannot verify, change a verified declaration, or classify schedules. */
export function TaxDeclarationForm({ token, existing }: { token: string; existing: ContractorSafeDeclaration | null }) {
  const router = useRouter()
  const [type, setType] = useState<DeclarationType>('contractor_chosen')
  const [ird, setIrd] = useState('')
  const [residency, setResidency] = useState('resident')
  const [rate, setRate] = useState('')
  const [activity, setActivity] = useState('')
  const [certRef, setCertRef] = useState('')
  const [expiry, setExpiry] = useState('')
  const [signedName, setSignedName] = useState('')
  const [ack, setAck] = useState(false)
  const [done, setDone] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const isExemption = type === 'exemption'
  const isTailored = type === 'tailored_rate'
  const input = 'rounded-lg border border-sage-200 px-3 py-2 text-sm w-full'

  function submit() {
    setErr(null)
    startTransition(async () => {
      const res = await submitContractorDeclaration({
        token,
        contractingIrdNumber: ird || undefined,
        residencyStatus: residency,
        declarationType: type,
        ir330cActivityNumber: activity || undefined,
        withholdingRate: isExemption || rate === '' ? null : Number(rate),
        expiryDate: (isExemption || isTailored) ? (expiry || undefined) : undefined,
        tailoredRateCertificateRef: isTailored ? (certRef || undefined) : undefined,
        exemptionCertificateRef: isExemption ? (certRef || undefined) : undefined,
        signedName,
        acknowledged: ack,
      })
      if (res.error) { setErr(res.error); return }
      setDone(true); router.refresh()
    })
  }

  const statusNote = existing?.status === 'verified' ? 'Your tax declaration is verified. Submitting a new one will replace it and go back to Sano for review.'
    : existing?.status === 'submitted' ? 'Your tax declaration is awaiting Sano review.'
    : existing?.needsResubmit ? 'Sano asked for a correction — please resubmit below.'
    : null

  return (
    <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
      <h2 className="text-lg font-semibold text-sage-800 mb-1">Your tax details (IR330C)</h2>
      <p className="text-sm text-sage-500 mb-3">Tell us how your payments should be taxed. Sano will review and verify this — it isn&rsquo;t final until we confirm it.</p>
      {statusNote && <p className="text-[13px] text-sage-600 mb-3 rounded-lg bg-sage-50 border border-sage-100 px-3 py-2">{statusNote}</p>}

      <div className="grid sm:grid-cols-2 gap-3">
        <label className="flex flex-col gap-1"><span className="text-[11px] text-sage-500">Declaration</span>
          <select className={input} value={type} onChange={(e) => setType(e.target.value as DeclarationType)}>{TYPES.map((t) => <option key={t.v} value={t.v}>{t.l}</option>)}</select></label>
        <label className="flex flex-col gap-1"><span className="text-[11px] text-sage-500">Your/your entity&rsquo;s IRD number</span><input className={input} value={ird} onChange={(e) => setIrd(e.target.value)} /></label>
        <label className="flex flex-col gap-1"><span className="text-[11px] text-sage-500">Tax residency</span>
          <select className={input} value={residency} onChange={(e) => setResidency(e.target.value)}><option value="resident">NZ tax resident</option><option value="non_resident">Non-resident</option></select></label>
        {!isExemption && <label className="flex flex-col gap-1"><span className="text-[11px] text-sage-500">Withholding rate</span><input className={input} value={rate} onChange={(e) => setRate(e.target.value)} placeholder="e.g. 0.20 for 20%" /></label>}
        <label className="flex flex-col gap-1"><span className="text-[11px] text-sage-500">IR330C activity number</span><input className={input} value={activity} onChange={(e) => setActivity(e.target.value)} placeholder="e.g. commercial cleaning" /></label>
        {(isTailored || isExemption) && <label className="flex flex-col gap-1"><span className="text-[11px] text-sage-500">{isExemption ? 'Exemption' : 'Tailored-rate'} certificate reference</span><input className={input} value={certRef} onChange={(e) => setCertRef(e.target.value)} /></label>}
        {(isTailored || isExemption) && <label className="flex flex-col gap-1"><span className="text-[11px] text-sage-500">Certificate expiry</span><input type="date" className={input} value={expiry} onChange={(e) => setExpiry(e.target.value)} /></label>}
      </div>

      <label className="flex items-start gap-2 mt-4 text-[13px] text-sage-700">
        <input type="checkbox" checked={ack} onChange={(e) => setAck(e.target.checked)} className="mt-0.5 rounded border-sage-300" />
        <span>{CONTRACTOR_DECLARATION_TEXT}</span>
      </label>
      <label className="flex flex-col gap-1 mt-3 max-w-xs"><span className="text-[11px] text-sage-500">Type your name to sign</span><input className={input} value={signedName} onChange={(e) => setSignedName(e.target.value)} /></label>

      {err && <p className="text-xs text-red-600 mt-2">{err}</p>}
      <div className="mt-4 flex items-center gap-3">
        <button type="button" onClick={submit} disabled={isPending || done} className="inline-flex items-center gap-2 bg-sage-500 text-white font-semibold px-5 py-2.5 rounded-lg text-sm hover:bg-sage-700 disabled:opacity-50">
          <Check size={15} /> {done ? 'Submitted' : isPending ? 'Submitting…' : 'Submit for review'}
        </button>
        {done && <span className="text-xs text-emerald-700">Thanks — Sano will review and verify your tax details.</span>}
      </div>
    </section>
  )
}
