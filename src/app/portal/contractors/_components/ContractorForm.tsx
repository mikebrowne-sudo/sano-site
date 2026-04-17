'use client'

import { useState, useTransition } from 'react'
import { createContractor, updateContractor } from '../_actions'
import clsx from 'clsx'

interface ContractorData {
  id?: string
  full_name: string
  email: string | null
  phone: string | null
  hourly_rate: number | null
  status: string
  worker_type: string
  notes: string | null
}

function toNum(v: string) {
  const n = parseFloat(v)
  return Number.isFinite(n) ? n : undefined
}

export function ContractorForm({ contractor }: { contractor?: ContractorData }) {
  const isEdit = !!contractor?.id

  const [fullName, setFullName] = useState(contractor?.full_name ?? '')
  const [email, setEmail] = useState(contractor?.email ?? '')
  const [phone, setPhone] = useState(contractor?.phone ?? '')
  const [hourlyRate, setHourlyRate] = useState(contractor?.hourly_rate != null ? String(contractor.hourly_rate) : '')
  const [status, setStatus] = useState(contractor?.status ?? 'active')
  const [workerType, setWorkerType] = useState(contractor?.worker_type ?? 'contractor')
  const [notes, setNotes] = useState(contractor?.notes ?? '')

  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (!fullName.trim()) {
      setError('Full name is required.')
      return
    }

    const input = {
      full_name: fullName.trim(),
      email: email.trim() || undefined,
      phone: phone.trim() || undefined,
      hourly_rate: toNum(hourlyRate),
      status,
      worker_type: workerType,
      notes: notes.trim() || undefined,
    }

    startTransition(async () => {
      const result = isEdit
        ? await updateContractor(contractor!.id!, input)
        : await createContractor(input)

      if (result?.error) {
        setError(result.error)
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-2xl space-y-10">
      <Section title="Details">
        <Field label="Full name" required value={fullName} onChange={setFullName} />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
          <Field label="Email" type="email" value={email} onChange={setEmail} />
          <Field label="Phone" type="tel" value={phone} onChange={setPhone} />
        </div>
        <Field label="Hourly rate ($)" type="number" step="0.01" min="0" value={hourlyRate} onChange={setHourlyRate} className="mt-4" />
      </Section>

      <Section title="Status">
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => setStatus('active')}
            className={clsx('px-4 py-2 rounded-lg text-sm font-medium transition-colors', status === 'active' ? 'bg-emerald-100 text-emerald-700 border border-emerald-300' : 'bg-sage-100 text-sage-600 hover:bg-sage-200')}
          >
            Active
          </button>
          <button
            type="button"
            onClick={() => setStatus('inactive')}
            className={clsx('px-4 py-2 rounded-lg text-sm font-medium transition-colors', status === 'inactive' ? 'bg-gray-200 text-gray-700 border border-gray-300' : 'bg-sage-100 text-sage-600 hover:bg-sage-200')}
          >
            Inactive
          </button>
        </div>
      </Section>

      <Section title="Worker Type">
        <div className="flex flex-wrap gap-2">
          {(['contractor', 'casual', 'part_time', 'full_time'] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setWorkerType(t)}
              className={clsx('px-4 py-2 rounded-lg text-sm font-medium transition-colors capitalize', workerType === t ? 'bg-sage-500 text-white' : 'bg-sage-100 text-sage-600 hover:bg-sage-200')}
            >
              {t.replace('_', ' ')}
            </button>
          ))}
        </div>
      </Section>

      <Section title="Notes">
        <textarea
          rows={3}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Any notes about this contractor…"
          className="w-full rounded-lg border border-sage-200 px-4 py-3 text-sage-800 placeholder:text-sage-300 focus:outline-none focus:ring-2 focus:ring-sage-500 focus:border-transparent text-sm resize-y"
        />
      </Section>

      {error && <p className="text-red-600 text-sm bg-red-50 rounded-lg px-4 py-3">{error}</p>}

      <div className="flex items-center gap-4">
        <button
          type="submit"
          disabled={isPending}
          className="bg-sage-500 text-white font-semibold px-6 py-3 rounded-lg hover:bg-sage-700 transition-colors disabled:opacity-50"
        >
          {isPending ? 'Saving…' : isEdit ? 'Save Changes' : 'Save Contractor'}
        </button>
        <a href={isEdit ? `/portal/contractors/${contractor!.id}` : '/portal/contractors'} className="text-sm text-sage-600 hover:text-sage-800 transition-colors">
          Cancel
        </a>
      </div>
    </form>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <fieldset>
      <legend className="text-lg font-semibold text-sage-800 mb-4">{title}</legend>
      {children}
    </fieldset>
  )
}

function Field({
  label, required, className, value, onChange, ...rest
}: {
  label: string; required?: boolean; className?: string
  value: string; onChange: (v: string) => void
  type?: string; step?: string; min?: string
}) {
  return (
    <label className={clsx('block', className)}>
      <span className="block text-sm font-semibold text-sage-800 mb-1.5">
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        className="w-full rounded-lg border border-sage-200 px-4 py-3 text-sage-800 placeholder:text-sage-300 focus:outline-none focus:ring-2 focus:ring-sage-500 focus:border-transparent text-sm"
        {...rest}
      />
    </label>
  )
}
