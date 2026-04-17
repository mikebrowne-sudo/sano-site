'use client'

import { useState, useTransition } from 'react'
import { createRecurringJob, updateRecurringJob } from '../_actions'
import { ChevronDown } from 'lucide-react'
import clsx from 'clsx'

interface Client { id: string; name: string; company_name: string | null }
interface ContractorOption { id: string; full_name: string }

interface RecurringJobData {
  id?: string
  client_id: string
  title: string | null
  description: string | null
  address: string | null
  scheduled_time: string | null
  duration_estimate: string | null
  contractor_id: string | null
  assigned_to: string | null
  contractor_price: number | null
  frequency: string
  start_date: string
  end_date: string | null
  status: string
}

function toNum(v: string) {
  const n = parseFloat(v)
  return Number.isFinite(n) ? n : undefined
}

export function RecurringJobForm({
  recurringJob,
  clients,
  contractors,
}: {
  recurringJob?: RecurringJobData
  clients: Client[]
  contractors: ContractorOption[]
}) {
  const isEdit = !!recurringJob?.id

  const [clientId, setClientId] = useState(recurringJob?.client_id ?? '')
  const [title, setTitle] = useState(recurringJob?.title ?? '')
  const [description, setDescription] = useState(recurringJob?.description ?? '')
  const [address, setAddress] = useState(recurringJob?.address ?? '')
  const [scheduledTime, setScheduledTime] = useState(recurringJob?.scheduled_time ?? '')
  const [durationEstimate, setDurationEstimate] = useState(recurringJob?.duration_estimate ?? '')
  const [contractorId, setContractorId] = useState(recurringJob?.contractor_id ?? '')
  const [assignedTo, setAssignedTo] = useState(recurringJob?.assigned_to ?? '')
  const [contractorPrice, setContractorPrice] = useState(recurringJob?.contractor_price != null ? String(recurringJob.contractor_price) : '')
  const [frequency, setFrequency] = useState(recurringJob?.frequency ?? 'weekly')
  const [startDate, setStartDate] = useState(recurringJob?.start_date ?? '')
  const [endDate, setEndDate] = useState(recurringJob?.end_date ?? '')
  const [status, setStatus] = useState(recurringJob?.status ?? 'active')

  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function handleContractorSelect(id: string) {
    setContractorId(id)
    const c = contractors.find((ct) => ct.id === id)
    setAssignedTo(c?.full_name ?? '')
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (!clientId) { setError('Client is required.'); return }
    if (!startDate) { setError('Start date is required.'); return }

    const input = {
      client_id: clientId,
      title: title.trim() || undefined,
      description: description.trim() || undefined,
      address: address.trim() || undefined,
      scheduled_time: scheduledTime.trim() || undefined,
      duration_estimate: durationEstimate.trim() || undefined,
      contractor_id: contractorId || undefined,
      assigned_to: assignedTo.trim() || undefined,
      contractor_price: toNum(contractorPrice),
      frequency,
      start_date: startDate,
      end_date: endDate || undefined,
      status,
    }

    startTransition(async () => {
      const result = isEdit
        ? await updateRecurringJob(recurringJob!.id!, input)
        : await createRecurringJob(input)
      if (result?.error) setError(result.error)
    })
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-2xl space-y-10">

      {/* Status (edit only) */}
      {isEdit && (
        <Section title="Status">
          <div className="flex gap-3">
            <button type="button" onClick={() => setStatus('active')} className={clsx('px-4 py-2 rounded-lg text-sm font-medium transition-colors', status === 'active' ? 'bg-emerald-100 text-emerald-700 border border-emerald-300' : 'bg-sage-100 text-sage-600 hover:bg-sage-200')}>Active</button>
            <button type="button" onClick={() => setStatus('paused')} className={clsx('px-4 py-2 rounded-lg text-sm font-medium transition-colors', status === 'paused' ? 'bg-gray-200 text-gray-700 border border-gray-300' : 'bg-sage-100 text-sage-600 hover:bg-sage-200')}>Paused</button>
          </div>
        </Section>
      )}

      {/* Client */}
      <Section title="Client">
        <Select label="Client" value={clientId} onChange={setClientId} options={clients.map((c) => ({ value: c.id, label: c.company_name ? `${c.name} — ${c.company_name}` : c.name }))} placeholder="Choose a client…" required />
      </Section>

      {/* Schedule */}
      <Section title="Schedule">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Select label="Frequency" value={frequency} onChange={setFrequency} options={[{ value: 'weekly', label: 'Weekly' }, { value: 'fortnightly', label: 'Fortnightly' }, { value: 'monthly', label: 'Monthly' }]} required />
          <Field label="Start date" type="date" value={startDate} onChange={setStartDate} required />
          <Field label="End date" type="date" value={endDate} onChange={setEndDate} placeholder="Optional" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
          <Field label="Scheduled time" value={scheduledTime} onChange={setScheduledTime} placeholder="e.g. 9:00am" />
          <Field label="Duration estimate" value={durationEstimate} onChange={setDurationEstimate} placeholder="e.g. 3 hours" />
        </div>
      </Section>

      {/* Job details */}
      <Section title="Job Details">
        <Field label="Title" value={title} onChange={setTitle} placeholder="e.g. Weekly clean — Smith residence" />
        <Field label="Address" value={address} onChange={setAddress} className="mt-4" />
        <TextArea label="Description" value={description} onChange={setDescription} className="mt-4" />
      </Section>

      {/* Contractor */}
      <Section title="Assignment">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Select label="Contractor" value={contractorId} onChange={handleContractorSelect} options={contractors.map((c) => ({ value: c.id, label: c.full_name }))} placeholder="Unassigned" />
          <Field label="Contractor price ($)" type="number" step="0.01" min="0" value={contractorPrice} onChange={setContractorPrice} />
        </div>
      </Section>

      {error && <p className="text-red-600 text-sm bg-red-50 rounded-lg px-4 py-3">{error}</p>}

      <div className="flex items-center gap-4">
        <button type="submit" disabled={isPending} className="bg-sage-500 text-white font-semibold px-6 py-3 rounded-lg hover:bg-sage-700 transition-colors disabled:opacity-50">
          {isPending ? 'Saving…' : isEdit ? 'Save Changes' : 'Create Recurring Job'}
        </button>
        <a href={isEdit ? `/portal/recurring-jobs/${recurringJob!.id}` : '/portal/recurring-jobs'} className="text-sm text-sage-600 hover:text-sage-800 transition-colors">Cancel</a>
      </div>
    </form>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return <fieldset><legend className="text-lg font-semibold text-sage-800 mb-4">{title}</legend>{children}</fieldset>
}

function Field({ label, required, className, value, onChange, ...rest }: { label: string; required?: boolean; className?: string; value: string; onChange: (v: string) => void; type?: string; step?: string; min?: string; placeholder?: string }) {
  return (
    <label className={clsx('block', className)}>
      <span className="block text-sm font-semibold text-sage-800 mb-1.5">{label}{required && <span className="text-red-500 ml-0.5">*</span>}</span>
      <input value={value} onChange={(e) => onChange(e.target.value)} required={required} className="w-full rounded-lg border border-sage-200 px-4 py-3 text-sage-800 placeholder:text-sage-300 focus:outline-none focus:ring-2 focus:ring-sage-500 focus:border-transparent text-sm" {...rest} />
    </label>
  )
}

function TextArea({ label, value, onChange, className }: { label: string; value: string; onChange: (v: string) => void; className?: string }) {
  return (
    <label className={clsx('block', className)}>
      <span className="block text-sm font-semibold text-sage-800 mb-1.5">{label}</span>
      <textarea rows={3} value={value} onChange={(e) => onChange(e.target.value)} className="w-full rounded-lg border border-sage-200 px-4 py-3 text-sage-800 placeholder:text-sage-300 focus:outline-none focus:ring-2 focus:ring-sage-500 focus:border-transparent text-sm resize-y" />
    </label>
  )
}

function Select({ label, value, onChange, options, placeholder = 'Select…', required }: { label: string; value: string; onChange: (v: string) => void; options: { value: string; label: string }[]; placeholder?: string; required?: boolean }) {
  return (
    <label className="block">
      <span className="block text-sm font-semibold text-sage-800 mb-1.5">{label}{required && <span className="text-red-500 ml-0.5">*</span>}</span>
      <div className="relative">
        <select value={value} onChange={(e) => onChange(e.target.value)} className="w-full appearance-none rounded-lg border border-sage-200 px-4 py-3 pr-10 text-sage-800 focus:outline-none focus:ring-2 focus:ring-sage-500 focus:border-transparent text-sm bg-white">
          <option value="">{placeholder}</option>
          {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-sage-400 pointer-events-none" />
      </div>
    </label>
  )
}
