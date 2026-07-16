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

export function CreateAgreementForm({
  contractors,
  employees,
}: {
  contractors: Person[]
  employees: Person[]
}) {
  const router = useRouter()
  const [agreementType, setAgreementType] = useState<'casual_employee' | 'contractor'>('casual_employee')
  const [personLabel, setPersonLabel] = useState('Carol')
  const [position, setPosition] = useState('Cleaner (Casual)')
  const [rate, setRate] = useState('')
  const [startDate, setStartDate] = useState('')
  const [linkedId, setLinkedId] = useState('')
  const [isTest, setIsTest] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const isContractor = agreementType === 'contractor'
  const people = isContractor ? contractors : employees

  function switchType(t: 'casual_employee' | 'contractor') {
    setAgreementType(t)
    setLinkedId('') // linked person is type-specific
  }

  function pickPerson(id: string) {
    setLinkedId(id)
    const p = people.find((x) => x.id === id)
    if (p) setPersonLabel(p.fullName) // reflect the linked name in the label
  }

  function create() {
    setError(null)
    startTransition(async () => {
      const res = await createEmploymentAgreement({
        agreementType,
        personLabel,
        position,
        hourlyRate: rate ? Number(rate) : null,
        startDate: startDate || null,
        linkedContractorId: isContractor ? (linkedId || null) : null,
        linkedEmployeeId: !isContractor ? (linkedId || null) : null,
        isTest,
      })
      if (res.error) { setError(res.error); return }
      if (res.id) router.push(`/portal/agreements/${res.id}`)
    })
  }

  const input = 'w-full rounded-lg border border-sage-200 px-3 py-2 text-sm text-sage-800 focus:outline-none focus:ring-2 focus:ring-sage-500'

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
      <h2 className="text-sm font-semibold text-sage-800 mb-3">New agreement</h2>
      <div className="inline-flex p-1 rounded-lg bg-sage-50 border border-sage-100 mb-4 text-sm">
        <button type="button" onClick={() => switchType('casual_employee')} className={agreementType === 'casual_employee' ? 'px-3 py-1.5 rounded-md bg-white shadow-sm font-medium text-sage-800' : 'px-3 py-1.5 text-sage-500'}>Casual employee</button>
        <button type="button" onClick={() => switchType('contractor')} className={agreementType === 'contractor' ? 'px-3 py-1.5 rounded-md bg-white shadow-sm font-medium text-sage-800' : 'px-3 py-1.5 text-sage-500'}>Contractor</button>
      </div>

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
        {!isContractor && (
          <label className="flex flex-col gap-1"><span className="text-[11px] font-medium text-sage-500">Hourly rate $ (incl. 8% hol.)</span>
            <input type="number" step="0.01" min="0" value={rate} onChange={(e) => setRate(e.target.value)} className={input} placeholder="e.g. 25.00" /></label>
        )}
        <label className="flex flex-col gap-1"><span className="text-[11px] font-medium text-sage-500">{isContractor ? 'Commencement date' : 'Start date'}</span>
          <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className={input} /></label>
      </div>
      <label className="flex items-start gap-2 mt-4 cursor-pointer">
        <input type="checkbox" checked={isTest} onChange={(e) => setIsTest(e.target.checked)} className="mt-0.5 rounded border-sage-300" />
        <span className="text-sm text-sage-700">
          Test run
          <span className="block text-[11px] text-sage-400">Dry-run the flow: no contractor/employee account is created, and only you are emailed on signing (not Carol or the admin inbox).</span>
        </span>
      </label>

      {error && <p className="text-sm text-red-600 mt-3">{error}</p>}
      <button type="button" onClick={create} disabled={isPending}
        className="mt-4 inline-flex items-center gap-2 bg-sage-500 text-white font-semibold px-5 py-2.5 rounded-lg text-sm hover:bg-sage-700 disabled:opacity-50">
        {isPending ? <Loader2 size={15} className="animate-spin" /> : <Plus size={15} />}
        {isPending ? 'Creating…' : 'Create & get link'}
      </button>
      <p className="text-[11px] text-sage-400 mt-2">Creates the agreement and a private link to send the employee to complete + sign.</p>
    </div>
  )
}
