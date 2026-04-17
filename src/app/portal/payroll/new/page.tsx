'use client'

import { useState, useTransition } from 'react'
import { createPayRun } from '../_actions'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

export default function NewPayRunPage() {
  const [start, setStart] = useState('')
  const [end, setEnd] = useState('')
  const [payDate, setPayDate] = useState('')
  const [notes, setNotes] = useState('')
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    startTransition(async () => {
      const result = await createPayRun({ pay_period_start: start, pay_period_end: end, pay_date: payDate, notes: notes.trim() || undefined })
      if (result?.error) setError(result.error)
    })
  }

  return (
    <div>
      <Link href="/portal/payroll" className="inline-flex items-center gap-1.5 text-sm text-sage-600 hover:text-sage-800 transition-colors mb-4"><ArrowLeft size={14} /> Back</Link>
      <h1 className="text-2xl font-bold text-sage-800 mb-8">New Pay Run</h1>
      <form onSubmit={handleSubmit} className="max-w-lg space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <label className="block">
            <span className="block text-sm font-semibold text-sage-800 mb-1.5">Period start</span>
            <input type="date" value={start} onChange={(e) => setStart(e.target.value)} required className="w-full rounded-lg border border-sage-200 px-4 py-3 text-sage-800 text-sm focus:outline-none focus:ring-2 focus:ring-sage-500" />
          </label>
          <label className="block">
            <span className="block text-sm font-semibold text-sage-800 mb-1.5">Period end</span>
            <input type="date" value={end} onChange={(e) => setEnd(e.target.value)} required className="w-full rounded-lg border border-sage-200 px-4 py-3 text-sage-800 text-sm focus:outline-none focus:ring-2 focus:ring-sage-500" />
          </label>
        </div>
        <label className="block">
          <span className="block text-sm font-semibold text-sage-800 mb-1.5">Pay date</span>
          <input type="date" value={payDate} onChange={(e) => setPayDate(e.target.value)} required className="w-full rounded-lg border border-sage-200 px-4 py-3 text-sage-800 text-sm focus:outline-none focus:ring-2 focus:ring-sage-500" />
        </label>
        <label className="block">
          <span className="block text-sm font-semibold text-sage-800 mb-1.5">Notes</span>
          <textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} className="w-full rounded-lg border border-sage-200 px-4 py-3 text-sage-800 text-sm resize-y focus:outline-none focus:ring-2 focus:ring-sage-500" />
        </label>
        {error && <p className="text-red-600 text-sm bg-red-50 rounded-lg px-4 py-3">{error}</p>}
        <button type="submit" disabled={isPending} className="bg-sage-500 text-white font-semibold px-6 py-3 rounded-lg hover:bg-sage-700 transition-colors disabled:opacity-50">
          {isPending ? 'Creating…' : 'Create Pay Run'}
        </button>
      </form>
    </div>
  )
}
