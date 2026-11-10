'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Send } from 'lucide-react'
import { sendOnboardingPack } from '@/app/portal/agreements/_actions'
import { GST_EXPECTATIONS, contractorRateLabel, gstExpectationToBool, type GstExpectation } from '@/lib/contractor-onboarding-pack'

type Structure = 'company' | 'sole_trader' | 'unsure'
type Insurance = 'own_required' | 'covered_by_sano' | 'not_required'

const STRUCTURES: { value: Structure; label: string }[] = [
  { value: 'company', label: 'Limited company' },
  { value: 'sole_trader', label: 'Sole trader' },
  { value: 'unsure', label: 'Not sure — they choose' },
]

const INSURANCE: { value: Insurance; label: string }[] = [
  { value: 'own_required', label: 'They hold their own public liability' },
  { value: 'covered_by_sano', label: 'Covered by Sano’s insurance' },
  { value: 'not_required', label: 'Not required' },
]

/** One-step onboarding for a new contractor: creates the contractor + agreement
 *  and emails the secure link. They complete everything online and e-sign. */
export function SendOnboardingPackForm() {
  const router = useRouter()
  const [businessName, setBusinessName] = useState('')
  const [contactName, setContactName] = useState('')
  const [email, setEmail] = useState('')
  const [rate, setRate] = useState('')
  const [gst, setGst] = useState<GstExpectation>('registered')
  const [structure, setStructure] = useState<Structure>('company')
  const [insurance, setInsurance] = useState<Insurance>('own_required')
  const [startDate, setStartDate] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const input = 'rounded-lg border border-sage-200 px-3 py-2 text-sm text-sage-800 focus:outline-none focus:ring-2 focus:ring-sage-500 w-full'
  const rateNum = Number(rate)

  function submit() {
    setError(null)
    startTransition(async () => {
      const res = await sendOnboardingPack({
        businessName, contactName, email, hourlyRate: rateNum, gst, structure, insurance, startDate: startDate || null,
      })
      if (res.error) {
        setError(res.error)
        if (res.id) router.push(`/portal/agreements/${res.id}`)
        return
      }
      if (res.id) router.push(`/portal/agreements/${res.id}`)
    })
  }

  return (
    <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">

      <div className="grid sm:grid-cols-2 gap-3">
        <label className="flex flex-col gap-1"><span className="text-[11px] font-medium text-sage-500">Business name</span>
          <input className={input} value={businessName} onChange={(e) => setBusinessName(e.target.value)} placeholder="e.g. Example Cleaning Ltd" /></label>
        <label className="flex flex-col gap-1"><span className="text-[11px] font-medium text-sage-500">Contact person *</span>
          <input className={input} value={contactName} onChange={(e) => setContactName(e.target.value)} /></label>
        <label className="flex flex-col gap-1"><span className="text-[11px] font-medium text-sage-500">Email *</span>
          <input type="email" className={input} value={email} onChange={(e) => setEmail(e.target.value)} /></label>
        <label className="flex flex-col gap-1"><span className="text-[11px] font-medium text-sage-500">Start date</span>
          <input type="date" className={input} value={startDate} onChange={(e) => setStartDate(e.target.value)} /></label>
        <label className="flex flex-col gap-1"><span className="text-[11px] font-medium text-sage-500">Hourly rate $ (incl. GST if registered) *</span>
          <input type="number" step="0.01" min="0" className={input} value={rate} onChange={(e) => setRate(e.target.value)} placeholder="e.g. 45.00" /></label>
        <label className="flex flex-col gap-1"><span className="text-[11px] font-medium text-sage-500">GST</span>
          <select className={input} value={gst} onChange={(e) => setGst(e.target.value as GstExpectation)}>
            {GST_EXPECTATIONS.map((g) => <option key={g.value} value={g.value}>{g.label}</option>)}
          </select></label>
        <label className="flex flex-col gap-1"><span className="text-[11px] font-medium text-sage-500">How they operate</span>
          <select className={input} value={structure} onChange={(e) => setStructure(e.target.value as Structure)}>
            {STRUCTURES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select></label>
        <label className="flex flex-col gap-1"><span className="text-[11px] font-medium text-sage-500">Insurance</span>
          <select className={input} value={insurance} onChange={(e) => setInsurance(e.target.value as Insurance)}>
            {INSURANCE.map((i) => <option key={i.value} value={i.value}>{i.label}</option>)}
          </select></label>
      </div>

      {rateNum > 0 && (
        <p className="text-[13px] text-sage-600 mt-3 rounded-lg bg-sage-50 border border-sage-100 px-3 py-2">
          Shown to them as: <span className="font-medium text-sage-800">{contractorRateLabel(rateNum, gstExpectationToBool(gst))}</span>
          {gst === 'unsure' && ' — they confirm their GST status in the form.'}
        </p>
      )}

      {error && <p className="text-xs text-red-600 mt-3">{error}</p>}
      <div className="mt-4">
        <button type="button" onClick={submit} disabled={isPending}
          className="inline-flex items-center gap-2 bg-sage-500 text-white font-semibold px-5 py-2.5 rounded-lg text-sm hover:bg-sage-700 disabled:opacity-50">
          <Send size={15} /> {isPending ? 'Sending…' : 'Send onboarding pack'}
        </button>
      </div>
    </section>
  )
}
