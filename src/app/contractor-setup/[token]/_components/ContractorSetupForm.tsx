'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Check, Flag } from 'lucide-react'
import { formatCurrency } from '@/lib/format'
import { submitIdentityStructure, flagScheduleTerm, confirmSchedules } from '../_actions'
import type { ContractorSafeSchedule } from '@/lib/contractor-setup-data'

type Structure = 'sole_trader' | 'company' | 'partnership' | 'trust' | 'other'

/** Contractor-facing setup: confirm identity + contracting structure (with only
 *  the fields relevant to the chosen structure) and review the service schedules.
 *  Rates/customer terms are read-only — a disagreement is flagged back to Sano.
 *  Receives only a contractor-SAFE view (no email, notes, cost centre, etc.). */
export function ContractorSetupForm({ token, contractor, schedules }: {
  token: string
  contractor: { fullName: string | null; businessStructure: string | null }
  schedules: ContractorSafeSchedule[]
}) {
  const router = useRouter()
  const [structure, setStructure] = useState<Structure>((contractor.businessStructure as Structure) || 'sole_trader')
  const [fullName, setFullName] = useState(contractor.fullName ?? '')
  const [preferredName, setPreferredName] = useState('')
  const [phone, setPhone] = useState('')
  const [address, setAddress] = useState('')
  const [legalName, setLegalName] = useState('')
  const [tradingName, setTradingName] = useState('')
  const [nzbn, setNzbn] = useState('')
  const [companyNumber, setCompanyNumber] = useState('')
  const [bankAccountName, setBankAccountName] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const isCompany = structure === 'company'
  const isEntity = structure !== 'sole_trader'

  function submit() {
    setErr(null)
    startTransition(async () => {
      const res = await submitIdentityStructure({
        token, fullName, preferredName, phone, address, businessStructure: structure,
        legalName, tradingName, nzbn, companyNumber, bankAccountName,
      })
      if (res.error) { setErr(res.error); return }
      setSubmitted(true)
      router.refresh()
    })
  }

  const input = 'rounded-lg border border-sage-200 px-3 py-2 text-sm text-sage-800 focus:outline-none focus:ring-2 focus:ring-sage-500 w-full'

  return (
    <div className="space-y-6">
      {/* Identity + structure */}
      <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <h2 className="text-lg font-semibold text-sage-800 mb-1">Your details</h2>
        <p className="text-sm text-sage-500 mb-4">Confirm or correct the details below. We&rsquo;ll review any changes before they take effect.</p>

        <div className="grid sm:grid-cols-2 gap-3">
          <label className="flex flex-col gap-1"><span className="text-[11px] font-medium text-sage-500">Full legal name *</span>
            <input className={input} value={fullName} onChange={(e) => setFullName(e.target.value)} /></label>
          <label className="flex flex-col gap-1"><span className="text-[11px] font-medium text-sage-500">Preferred name</span>
            <input className={input} value={preferredName} onChange={(e) => setPreferredName(e.target.value)} /></label>
          <label className="flex flex-col gap-1"><span className="text-[11px] font-medium text-sage-500">Phone</span>
            <input className={input} value={phone} onChange={(e) => setPhone(e.target.value)} /></label>
          <label className="flex flex-col gap-1"><span className="text-[11px] font-medium text-sage-500">Address</span>
            <input className={input} value={address} onChange={(e) => setAddress(e.target.value)} /></label>
        </div>

        <div className="mt-4">
          <span className="text-[11px] font-medium text-sage-500">Contracting structure *</span>
          <div className="grid sm:grid-cols-3 gap-2 mt-1">
            {([['sole_trader', 'Sole trader'], ['company', 'Company'], ['partnership', 'Partnership'], ['trust', 'Trust'], ['other', 'Other']] as [Structure, string][]).map(([v, l]) => (
              <label key={v} className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm cursor-pointer ${structure === v ? 'border-sage-500 bg-sage-50' : 'border-sage-200'}`}>
                <input type="radio" name="structure" checked={structure === v} onChange={() => setStructure(v)} /> {l}
              </label>
            ))}
          </div>
        </div>

        {/* Structure-conditional fields */}
        <div className="grid sm:grid-cols-2 gap-3 mt-4">
          {structure === 'sole_trader' && (
            <>
              <label className="flex flex-col gap-1"><span className="text-[11px] font-medium text-sage-500">Trading name (optional)</span>
                <input className={input} value={tradingName} onChange={(e) => setTradingName(e.target.value)} /></label>
              <label className="flex flex-col gap-1"><span className="text-[11px] font-medium text-sage-500">NZBN (optional)</span>
                <input className={input} value={nzbn} onChange={(e) => setNzbn(e.target.value)} /></label>
            </>
          )}
          {isEntity && (
            <label className="flex flex-col gap-1"><span className="text-[11px] font-medium text-sage-500">{isCompany ? 'Company legal name' : structure === 'trust' ? 'Trust name' : structure === 'partnership' ? 'Partnership name' : 'Entity name'}</span>
              <input className={input} value={legalName} onChange={(e) => setLegalName(e.target.value)} /></label>
          )}
          {isEntity && (
            <label className="flex flex-col gap-1"><span className="text-[11px] font-medium text-sage-500">Trading name</span>
              <input className={input} value={tradingName} onChange={(e) => setTradingName(e.target.value)} /></label>
          )}
          {isEntity && (
            <label className="flex flex-col gap-1"><span className="text-[11px] font-medium text-sage-500">NZBN</span>
              <input className={input} value={nzbn} onChange={(e) => setNzbn(e.target.value)} /></label>
          )}
          {isCompany && (
            <label className="flex flex-col gap-1"><span className="text-[11px] font-medium text-sage-500">Company number</span>
              <input className={input} value={companyNumber} onChange={(e) => setCompanyNumber(e.target.value)} /></label>
          )}
          <label className="flex flex-col gap-1"><span className="text-[11px] font-medium text-sage-500">Bank account name</span>
            <input className={input} value={bankAccountName} onChange={(e) => setBankAccountName(e.target.value)} placeholder="Name on the account you'll be paid into" /></label>
        </div>

        <p className="text-[11px] text-sage-400 mt-3">
          Your IRD number, GST details and tax declaration (IR330C) will be requested in a follow-up step. We won&rsquo;t ask you to repeat
          anything already confirmed.
        </p>

        {err && <p className="text-xs text-red-600 mt-2">{err}</p>}
        <div className="mt-4 flex items-center gap-3">
          <button type="button" onClick={submit} disabled={isPending || submitted} className="inline-flex items-center gap-2 bg-sage-500 text-white font-semibold px-5 py-2.5 rounded-lg text-sm hover:bg-sage-700 disabled:opacity-50">
            <Check size={15} /> {submitted ? 'Submitted' : isPending ? 'Submitting…' : 'Submit my details'}
          </button>
          {submitted && <span className="text-xs text-emerald-700">Thanks — Sano will review your details.</span>}
        </div>
      </section>

      {/* Service schedules — read-only, flag/confirm only */}
      <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <h2 className="text-lg font-semibold text-sage-800 mb-1">Your work arrangements</h2>
        <p className="text-sm text-sage-500 mb-4">Please check these are right. If a rate or customer detail looks wrong, flag it and we&rsquo;ll sort it — you don&rsquo;t change it here.</p>
        {schedules.length === 0 ? (
          <p className="text-sm text-sage-400">No arrangements to review yet.</p>
        ) : (
          <div className="space-y-3">
            {schedules.map((s) => <ScheduleReview key={s.id} token={token} schedule={s} />)}
            <ConfirmAll token={token} />
          </div>
        )}
      </section>
    </div>
  )
}

function ScheduleReview({ token, schedule }: { token: string; schedule: ContractorSafeSchedule }) {
  const router = useRouter()
  const [flagging, setFlagging] = useState(false)
  const [note, setNote] = useState('')
  const [done, setDone] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function flag() {
    setErr(null)
    startTransition(async () => {
      const res = await flagScheduleTerm(token, schedule.name, note)
      if (res.error) { setErr(res.error); return }
      setDone(true); setFlagging(false)
      router.refresh()
    })
  }

  const basis = schedule.paymentBasis === 'guaranteed_net' ? 'you receive' : 'gross fee'
  return (
    <div className="border border-sage-100 rounded-xl p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-medium text-sage-800">{schedule.name}</p>
          <p className="text-xs text-sage-500">{schedule.serviceType ?? ''}{schedule.serviceAddress ? ` · ${schedule.serviceAddress}` : ''}</p>
          <p className="text-sm text-sage-700 mt-1">
            {schedule.paymentMethod?.replace(/_/g, ' ') ?? '—'}
            {schedule.agreedAmount != null && <> · {formatCurrency(schedule.agreedAmount)} <span className="text-sage-400">({basis})</span></>}
          </p>
        </div>
        {!done && <button type="button" onClick={() => setFlagging((v) => !v)} className="text-xs text-amber-700 hover:text-amber-800 inline-flex items-center gap-1 shrink-0"><Flag size={12} /> Flag an issue</button>}
        {done && <span className="text-xs text-emerald-700 shrink-0">Flagged — Sano notified</span>}
      </div>
      {flagging && (
        <div className="mt-3 flex items-center gap-2">
          <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="What looks wrong?" className="rounded-lg border border-sage-200 px-3 py-1.5 text-sm w-full" />
          <button type="button" onClick={flag} disabled={isPending} className="text-sm bg-amber-600 text-white px-3 py-1.5 rounded-lg disabled:opacity-50">Send</button>
        </div>
      )}
      {err && <p className="text-xs text-red-600 mt-1">{err}</p>}
    </div>
  )
}

function ConfirmAll({ token }: { token: string }) {
  const router = useRouter()
  const [done, setDone] = useState(false)
  const [isPending, startTransition] = useTransition()
  return (
    <div className="pt-1">
      <button type="button" disabled={isPending || done} onClick={() => startTransition(async () => {
        await confirmSchedules(token)
        setDone(true); router.refresh()
      })} className="inline-flex items-center gap-2 border border-sage-200 text-sage-700 font-medium px-4 py-2 rounded-lg text-sm hover:bg-sage-50 disabled:opacity-50">
        <Check size={14} /> {done ? 'Confirmed' : 'These arrangements look right'}
      </button>
    </div>
  )
}
