'use client'

import { useState, useTransition } from 'react'
import { createContractorInvoice, updateContractorInvoice } from '../_actions'
import { ChevronDown } from 'lucide-react'
import clsx from 'clsx'

interface Contractor { id: string; full_name: string }
interface JobOption { id: string; job_number: string; title: string | null }

interface CIData {
  id?: string
  contractor_id: string
  job_id: string | null
  amount: number
  date_submitted: string
  notes: string | null
  status: string
}

export function CIForm({ ci, contractors, jobs }: { ci?: CIData; contractors: Contractor[]; jobs: JobOption[] }) {
  const isEdit = !!ci?.id

  const [contractorId, setContractorId] = useState(ci?.contractor_id ?? '')
  const [jobId, setJobId] = useState(ci?.job_id ?? '')
  const [amount, setAmount] = useState(ci?.amount ? String(ci.amount) : '')
  const [dateSubmitted, setDateSubmitted] = useState(ci?.date_submitted ?? new Date().toISOString().slice(0, 10))
  const [notes, setNotes] = useState(ci?.notes ?? '')
  const [status, setStatus] = useState(ci?.status ?? 'pending')

  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (!contractorId) { setError('Contractor is required.'); return }
    const amt = parseFloat(amount)
    if (!amt || amt <= 0) { setError('Amount must be greater than zero.'); return }

    const input = { contractor_id: contractorId, job_id: jobId || undefined, amount: amt, date_submitted: dateSubmitted, notes: notes.trim() || undefined, status }

    startTransition(async () => {
      const result = isEdit ? await updateContractorInvoice(ci!.id!, input) : await createContractorInvoice(input)
      if (result?.error) setError(result.error)
    })
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-2xl space-y-8">
      <Section title="Details">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Sel label="Contractor" required value={contractorId} onChange={setContractorId} options={contractors.map((c) => ({ value: c.id, label: c.full_name }))} placeholder="Select contractor…" />
          <Sel label="Linked job" value={jobId} onChange={setJobId} options={jobs.map((j) => ({ value: j.id, label: `${j.job_number}${j.title ? ` — ${j.title}` : ''}` }))} placeholder="None" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
          <label className="block">
            <span className="block text-sm font-semibold text-sage-800 mb-1.5">Amount ($) <span className="text-red-500">*</span></span>
            <input type="number" step="0.01" min="0" value={amount} onChange={(e) => setAmount(e.target.value)} required className="w-full rounded-lg border border-sage-200 px-4 py-3 text-sage-800 text-sm focus:outline-none focus:ring-2 focus:ring-sage-500" />
          </label>
          <label className="block">
            <span className="block text-sm font-semibold text-sage-800 mb-1.5">Date submitted</span>
            <input type="date" value={dateSubmitted} onChange={(e) => setDateSubmitted(e.target.value)} className="w-full rounded-lg border border-sage-200 px-4 py-3 text-sage-800 text-sm focus:outline-none focus:ring-2 focus:ring-sage-500" />
          </label>
        </div>
      </Section>

      {isEdit && (
        <Section title="Status">
          <div className="flex gap-2">
            {(['pending', 'approved', 'paid'] as const).map((s) => (
              <button key={s} type="button" onClick={() => setStatus(s)} className={clsx('px-4 py-2 rounded-lg text-sm font-medium transition-colors capitalize', status === s ? (s === 'paid' ? 'bg-emerald-100 text-emerald-700 border border-emerald-300' : s === 'approved' ? 'bg-blue-100 text-blue-700 border border-blue-300' : 'bg-gray-200 text-gray-700 border border-gray-300') : 'bg-sage-100 text-sage-600 hover:bg-sage-200')}>
                {s}
              </button>
            ))}
          </div>
        </Section>
      )}

      <Section title="Notes">
        <textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Invoice notes…" className="w-full rounded-lg border border-sage-200 px-4 py-3 text-sage-800 placeholder:text-sage-300 text-sm resize-y focus:outline-none focus:ring-2 focus:ring-sage-500" />
      </Section>

      {error && <p className="text-red-600 text-sm bg-red-50 rounded-lg px-4 py-3">{error}</p>}

      <div className="flex items-center gap-4">
        <button type="submit" disabled={isPending} className="bg-sage-500 text-white font-semibold px-6 py-3 rounded-lg hover:bg-sage-700 transition-colors disabled:opacity-50">
          {isPending ? 'Saving…' : isEdit ? 'Save Changes' : 'Create Invoice'}
        </button>
        <a href={isEdit ? `/portal/contractor-invoices/${ci!.id}` : '/portal/contractor-invoices'} className="text-sm text-sage-600 hover:text-sage-800">Cancel</a>
      </div>
    </form>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return <fieldset><legend className="text-lg font-semibold text-sage-800 mb-4">{title}</legend>{children}</fieldset>
}

function Sel({ label, value, onChange, options, placeholder = 'Select…', required }: { label: string; value: string; onChange: (v: string) => void; options: { value: string; label: string }[]; placeholder?: string; required?: boolean }) {
  return (
    <label className="block">
      <span className="block text-sm font-semibold text-sage-800 mb-1.5">{label}{required && <span className="text-red-500 ml-0.5">*</span>}</span>
      <div className="relative">
        <select value={value} onChange={(e) => onChange(e.target.value)} className="w-full appearance-none rounded-lg border border-sage-200 px-4 py-3 pr-10 text-sage-800 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-sage-500">
          <option value="">{placeholder}</option>
          {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-sage-400 pointer-events-none" />
      </div>
    </label>
  )
}
