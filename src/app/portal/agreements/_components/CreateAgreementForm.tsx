'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Loader2 } from 'lucide-react'
import { createEmploymentAgreement } from '../_actions'

export function CreateAgreementForm() {
  const router = useRouter()
  const [personLabel, setPersonLabel] = useState('Carol')
  const [position, setPosition] = useState('Cleaner (Casual)')
  const [rate, setRate] = useState('')
  const [startDate, setStartDate] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function create() {
    setError(null)
    startTransition(async () => {
      const res = await createEmploymentAgreement({
        personLabel,
        position,
        hourlyRate: rate ? Number(rate) : null,
        startDate: startDate || null,
      })
      if (res.error) { setError(res.error); return }
      if (res.id) router.push(`/portal/agreements/${res.id}`)
    })
  }

  const input = 'w-full rounded-lg border border-sage-200 px-3 py-2 text-sm text-sage-800 focus:outline-none focus:ring-2 focus:ring-sage-500'

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
      <h2 className="text-sm font-semibold text-sage-800 mb-3">New agreement</h2>
      <div className="grid grid-cols-2 gap-3">
        <label className="flex flex-col gap-1"><span className="text-[11px] font-medium text-sage-500">Employee</span>
          <input value={personLabel} onChange={(e) => setPersonLabel(e.target.value)} className={input} /></label>
        <label className="flex flex-col gap-1"><span className="text-[11px] font-medium text-sage-500">Position</span>
          <input value={position} onChange={(e) => setPosition(e.target.value)} className={input} /></label>
        <label className="flex flex-col gap-1"><span className="text-[11px] font-medium text-sage-500">Hourly rate $ (incl. 8% hol.)</span>
          <input type="number" step="0.01" min="0" value={rate} onChange={(e) => setRate(e.target.value)} className={input} placeholder="e.g. 25.00" /></label>
        <label className="flex flex-col gap-1"><span className="text-[11px] font-medium text-sage-500">Start date</span>
          <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className={input} /></label>
      </div>
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
