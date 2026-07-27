'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Loader2 } from 'lucide-react'
import { createEmploymentAgreement } from '../_actions'

interface Person {
  id: string
  fullName: string
  email: string | null
}

type Mode = 'employee' | 'contractor'
type EmploymentType = 'casual' | 'part_time' | 'full_time'
type AgreementType = 'casual_employee' | 'permanent_employee' | 'contractor'

// Employment type → the legal agreement (clause set). Casual is a casual
// employment agreement (PAYG holiday pay); part-time and full-time are both
// permanent agreements (accrued leave) — they differ only in hours + the label.
function agreementTypeFor(mode: Mode, empType: EmploymentType): AgreementType {
  if (mode === 'contractor') return 'contractor'
  return empType === 'casual' ? 'casual_employee' : 'permanent_employee'
}

// Sensible defaults per employment type.
const DEFAULTS: Record<EmploymentType, { position: string; hours: string; days: string; place: string; pay: string; notice: string }> = {
  casual:    { position: 'Cleaner (Casual)', hours: '',   days: 'As offered — no guaranteed hours (e.g. typically Saturday mornings)', place: 'Various client premises across Auckland', pay: 'weekly', notice: '1 week' },
  part_time: { position: 'Cleaner', hours: '20', days: 'Monday, Tuesday, Thursday and Friday, normally 9:00 am to 2:00 pm', place: 'Home-based (visiting client sites as required)', pay: 'weekly', notice: '2 weeks' },
  full_time: { position: 'Cleaner', hours: '40', days: 'Monday to Friday, 9:00 am to 5:00 pm', place: 'Home-based (visiting client sites as required)', pay: 'weekly', notice: '4 weeks' },
}

export function CreateAgreementForm({
  contractors,
  employees,
}: {
  contractors: Person[]
  employees: Person[]
}) {
  const router = useRouter()
  const [mode, setMode] = useState<Mode>('employee')
  const [employmentType, setEmploymentType] = useState<EmploymentType>('part_time')
  const [personLabel, setPersonLabel] = useState('')
  const [position, setPosition] = useState(DEFAULTS.part_time.position)
  const [rate, setRate] = useState('')
  const [startDate, setStartDate] = useState('')
  const [linkedId, setLinkedId] = useState('')
  const [isTest, setIsTest] = useState(false)
  const [hoursPerWeek, setHoursPerWeek] = useState(DEFAULTS.part_time.hours)
  const [days, setDays] = useState(DEFAULTS.part_time.days)
  const [placeOfWork, setPlaceOfWork] = useState(DEFAULTS.part_time.place)
  const [payFrequency, setPayFrequency] = useState(DEFAULTS.part_time.pay)
  const [noticePeriod, setNoticePeriod] = useState(DEFAULTS.part_time.notice)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const isContractor = mode === 'contractor'
  const isCasual = mode === 'employee' && employmentType === 'casual'
  const isPermanent = mode === 'employee' && (employmentType === 'part_time' || employmentType === 'full_time')
  const agreementType = agreementTypeFor(mode, employmentType)
  const people = isContractor ? contractors : employees

  function switchMode(m: Mode) {
    setMode(m)
    setLinkedId('')
    if (m === 'employee') applyEmploymentDefaults(employmentType)
  }

  function applyEmploymentDefaults(t: EmploymentType) {
    setEmploymentType(t)
    const d = DEFAULTS[t]
    setPosition(d.position)
    setHoursPerWeek(d.hours)
    setDays(d.days)
    setPlaceOfWork(d.place)
    setPayFrequency(d.pay)
    setNoticePeriod(d.notice)
  }

  function pickPerson(id: string) {
    setLinkedId(id)
    const p = people.find((x) => x.id === id)
    if (p) setPersonLabel(p.fullName)
  }

  function create() {
    setError(null)
    startTransition(async () => {
      const res = await createEmploymentAgreement({
        agreementType,
        employmentType: isContractor ? null : employmentType,
        personLabel,
        position,
        hourlyRate: rate ? Number(rate) : null,
        startDate: startDate || null,
        // Part-time/full-time carry hours; all employee types carry the pattern/
        // availability text in agreedDays. Casual has no guaranteed hours.
        agreedHoursPerWeek: isPermanent && hoursPerWeek ? Number(hoursPerWeek) : null,
        agreedDays: !isContractor ? days : null,
        placeOfWork: isPermanent ? placeOfWork : null,
        payFrequency: isPermanent ? payFrequency : null,
        noticePeriod: isPermanent ? noticePeriod : null,
        linkedContractorId: isContractor ? (linkedId || null) : null,
        linkedEmployeeId: !isContractor ? (linkedId || null) : null,
        isTest,
      })
      if (res.error) { setError(res.error); return }
      if (res.id) router.push(`/portal/agreements/${res.id}`)
    })
  }

  const input = 'w-full rounded-lg border border-sage-200 px-3 py-2 text-sm text-sage-800 focus:outline-none focus:ring-2 focus:ring-sage-500'
  const tab = (active: boolean) => active ? 'px-3 py-1.5 rounded-md bg-white shadow-sm font-medium text-sage-800' : 'px-3 py-1.5 text-sage-500'

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
      <h2 className="text-sm font-semibold text-sage-800 mb-3">New agreement</h2>
      <div className="inline-flex p-1 rounded-lg bg-sage-50 border border-sage-100 mb-4 text-sm">
        <button type="button" onClick={() => switchMode('employee')} className={tab(mode === 'employee')}>Employee</button>
        <button type="button" onClick={() => switchMode('contractor')} className={tab(isContractor)}>Contractor</button>
      </div>

      {/* Employment type — employees only. Drives the clause set + entitlements. */}
      {!isContractor && (
        <label className="flex flex-col gap-1 mb-3 max-w-xs">
          <span className="text-[11px] font-medium text-sage-500">Employment type</span>
          <select value={employmentType} onChange={(e) => applyEmploymentDefaults(e.target.value as EmploymentType)} className={input}>
            <option value="casual">Casual (no guaranteed hours · PAYG holiday pay)</option>
            <option value="part_time">Part-time (permanent · accrued leave)</option>
            <option value="full_time">Full-time (permanent · accrued leave)</option>
          </select>
        </label>
      )}

      {/* Link an existing person — pre-fills their known details and ties the
          agreement to them so signing updates that record (no duplicate). */}
      <label className="flex flex-col gap-1 mb-3">
        <span className="text-[11px] font-medium text-sage-500">Link existing {isContractor ? 'contractor' : 'employee'} <span className="text-sage-400">(optional)</span></span>
        <select value={linkedId} onChange={(e) => pickPerson(e.target.value)} className={input}>
          <option value="">— New {isContractor ? 'contractor' : 'employee'} —</option>
          {people.map((p) => (
            <option key={p.id} value={p.id}>{p.fullName}{p.email ? ` · ${p.email}` : ''}</option>
          ))}
        </select>
        {linkedId && <span className="text-[11px] text-sage-400">Their name, email and phone will pre-fill; the rest they complete when signing.</span>}
      </label>

      <div className="grid grid-cols-2 gap-3">
        <label className="flex flex-col gap-1"><span className="text-[11px] font-medium text-sage-500">{isContractor ? 'Contractor (label)' : 'Employee'}</span>
          <input value={personLabel} onChange={(e) => setPersonLabel(e.target.value)} className={input} /></label>
        {!isContractor && (
          <label className="flex flex-col gap-1"><span className="text-[11px] font-medium text-sage-500">Position</span>
            <input value={position} onChange={(e) => setPosition(e.target.value)} className={input} /></label>
        )}
        <label className="flex flex-col gap-1"><span className="text-[11px] font-medium text-sage-500">{isContractor ? 'Contractor rate $ (per hour, incl. GST)' : isCasual ? 'Hourly rate $ (incl. 8% hol.)' : 'Hourly rate $ (base — leave accrued)'}</span>
          <input type="number" step="0.01" min="0" value={rate} onChange={(e) => setRate(e.target.value)} className={input} placeholder={isContractor ? 'e.g. 35.00' : 'e.g. 30.00'} /></label>
        <label className="flex flex-col gap-1"><span className="text-[11px] font-medium text-sage-500">{isContractor ? 'Commencement date' : 'Start date'}</span>
          <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className={input} /></label>
      </div>

      {/* Casual — indicative availability only (no guaranteed hours). */}
      {isCasual && (
        <div className="mt-3 rounded-lg border border-sage-100 bg-sage-50/50 p-3">
          <label className="flex flex-col gap-1"><span className="text-[11px] font-medium text-sage-500">Indicative availability</span>
            <textarea rows={2} value={days} onChange={(e) => setDays(e.target.value)} className={input}
              placeholder="e.g. As offered — typically Saturday mornings; no guaranteed hours" />
            <span className="text-[11px] text-sage-400">Casual employment has no guaranteed hours. This is an indicative note only; work is offered and accepted per engagement.</span></label>
        </div>
      )}

      {/* Part-time / full-time — permanent terms. */}
      {isPermanent && (
        <div className="mt-3 grid grid-cols-2 gap-3 rounded-lg border border-sage-100 bg-sage-50/50 p-3">
          <label className="flex flex-col gap-1"><span className="text-[11px] font-medium text-sage-500">Hours per week</span>
            <input type="number" step="0.5" min="0" value={hoursPerWeek} onChange={(e) => setHoursPerWeek(e.target.value)} className={input} /></label>
          <label className="flex flex-col gap-1 col-span-2"><span className="text-[11px] font-medium text-sage-500">Working pattern — days &amp; approximate hours</span>
            <textarea rows={2} value={days} onChange={(e) => setDays(e.target.value)} className={input}
              placeholder="e.g. Monday, Tuesday, Thursday and Friday, normally 9:00 am to 2:00 pm (hours may vary by agreement)" />
            <span className="text-[11px] text-sage-400">State the actual days and approximate start/finish times, plus any flexibility expected. This appears in the agreement under “Hours of work”.</span></label>
          <label className="flex flex-col gap-1 col-span-2"><span className="text-[11px] font-medium text-sage-500">Place of work</span>
            <input value={placeOfWork} onChange={(e) => setPlaceOfWork(e.target.value)} className={input} /></label>
          <label className="flex flex-col gap-1"><span className="text-[11px] font-medium text-sage-500">Pay cycle</span>
            <select value={payFrequency} onChange={(e) => setPayFrequency(e.target.value)} className={input}>
              <option value="weekly">Weekly</option>
              <option value="fortnightly">Fortnightly</option>
            </select></label>
          <label className="flex flex-col gap-1"><span className="text-[11px] font-medium text-sage-500">Notice period</span>
            <input value={noticePeriod} onChange={(e) => setNoticePeriod(e.target.value)} className={input} /></label>
          <p className="col-span-2 text-[11px] text-sage-400">Permanent = accrued leave (4 weeks annual + 10 days sick). The template wording is a draft — have it reviewed before signing.</p>
        </div>
      )}

      <label className="flex items-start gap-2 mt-4 cursor-pointer">
        <input type="checkbox" checked={isTest} onChange={(e) => setIsTest(e.target.checked)} className="mt-0.5 rounded border-sage-300" />
        <span className="text-sm text-sage-700">
          Test run
          <span className="block text-[11px] text-sage-400">Dry-run the flow: no workforce account is created, and only you are emailed on signing (not the employee or the admin inbox).</span>
        </span>
      </label>

      {error && <p className="text-sm text-red-600 mt-3">{error}</p>}
      <button type="button" onClick={create} disabled={isPending}
        className="mt-4 inline-flex items-center gap-2 bg-sage-500 text-white font-semibold px-5 py-2.5 rounded-lg text-sm hover:bg-sage-700 disabled:opacity-50">
        {isPending ? <Loader2 size={15} className="animate-spin" /> : <Plus size={15} />}
        {isPending ? 'Creating…' : 'Create & get link'}
      </button>
      <p className="text-[11px] text-sage-400 mt-2">Creates the agreement and a private link to send the {isContractor ? 'contractor' : 'employee'} to complete + sign.</p>
    </div>
  )
}
