'use client'

import { useState, useTransition } from 'react'
import { createJob, updateJob } from '../_actions'
import { ChevronDown } from 'lucide-react'
import clsx from 'clsx'

const STATUSES = [
  { value: 'draft', label: 'Draft' },
  { value: 'assigned', label: 'Assigned' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'completed', label: 'Completed' },
  { value: 'invoiced', label: 'Invoiced' },
]

const STATUS_STYLES: Record<string, string> = {
  draft:       'bg-gray-100 text-gray-700',
  assigned:    'bg-blue-50 text-blue-700',
  in_progress: 'bg-amber-50 text-amber-700',
  completed:   'bg-emerald-50 text-emerald-700',
  invoiced:    'bg-purple-50 text-purple-700',
}

interface Client { id: string; name: string; company_name: string | null }
interface ContractorOption { id: string; full_name: string }
interface QuoteOption { id: string; quote_number: string }
interface InvoiceOption { id: string; invoice_number: string }

interface JobData {
  id?: string
  client_id: string
  quote_id: string | null
  invoice_id: string | null
  status: string
  title: string | null
  description: string | null
  address: string | null
  scheduled_date: string | null
  scheduled_time: string | null
  duration_estimate: string | null
  assigned_to: string | null
  contractor_id: string | null
  contractor_price: number | null
  job_price: number | null
  internal_notes: string | null
  contractor_notes: string | null
}

function toNum(v: string) {
  const n = parseFloat(v)
  return Number.isFinite(n) ? n : undefined
}

export function JobForm({
  job,
  clients,
  contractors,
  quotes,
  invoices,
}: {
  job?: JobData
  clients: Client[]
  contractors: ContractorOption[]
  quotes: QuoteOption[]
  invoices: InvoiceOption[]
}) {
  const isEdit = !!job?.id

  const [clientId, setClientId] = useState(job?.client_id ?? '')
  const [quoteId, setQuoteId] = useState(job?.quote_id ?? '')
  const [invoiceId, setInvoiceId] = useState(job?.invoice_id ?? '')
  const [status, setStatus] = useState(job?.status ?? 'draft')
  const [title, setTitle] = useState(job?.title ?? '')
  const [description, setDescription] = useState(job?.description ?? '')
  const [address, setAddress] = useState(job?.address ?? '')
  const [scheduledDate, setScheduledDate] = useState(job?.scheduled_date ?? '')
  const [scheduledTime, setScheduledTime] = useState(job?.scheduled_time ?? '')
  const [durationEstimate, setDurationEstimate] = useState(job?.duration_estimate ?? '')
  const [contractorId, setContractorId] = useState(job?.contractor_id ?? '')
  const [assignedTo, setAssignedTo] = useState(job?.assigned_to ?? '')

  function handleContractorSelect(id: string) {
    setContractorId(id)
    const c = contractors.find((ct) => ct.id === id)
    setAssignedTo(c?.full_name ?? '')
  }
  const [contractorPrice, setContractorPrice] = useState(job?.contractor_price != null ? String(job.contractor_price) : '')
  const [jobPrice, setJobPrice] = useState(job?.job_price != null ? String(job.job_price) : '')
  const [internalNotes, setInternalNotes] = useState(job?.internal_notes ?? '')
  const [contractorNotes, setContractorNotes] = useState(job?.contractor_notes ?? '')

  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (!clientId) {
      setError('Client is required.')
      return
    }

    const input = {
      client_id: clientId,
      quote_id: quoteId || undefined,
      invoice_id: invoiceId || undefined,
      title: title.trim() || undefined,
      description: description.trim() || undefined,
      address: address.trim() || undefined,
      scheduled_date: scheduledDate || undefined,
      scheduled_time: scheduledTime.trim() || undefined,
      duration_estimate: durationEstimate.trim() || undefined,
      assigned_to: assignedTo.trim() || undefined,
      contractor_id: contractorId.trim() || undefined,
      contractor_price: toNum(contractorPrice),
      job_price: toNum(jobPrice),
      internal_notes: internalNotes.trim() || undefined,
    }

    startTransition(async () => {
      const result = isEdit
        ? await updateJob({
            ...input,
            id: job!.id!,
            status,
            contractor_notes: contractorNotes.trim() || undefined,
          })
        : await createJob(input)

      if (result?.error) {
        setError(result.error)
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-2xl space-y-10">

      {/* Status (edit only) */}
      {isEdit && (
        <Section title="Status">
          <div className="flex flex-wrap gap-2">
            {STATUSES.map((s) => (
              <button
                key={s.value}
                type="button"
                onClick={() => setStatus(s.value)}
                className={clsx(
                  'px-4 py-2 rounded-lg text-sm font-medium transition-colors border',
                  status === s.value
                    ? `${STATUS_STYLES[s.value]} border-current`
                    : 'bg-white text-sage-600 border-sage-200 hover:bg-sage-50',
                )}
              >
                {s.label}
              </button>
            ))}
          </div>
        </Section>
      )}

      {/* Client + Links */}
      <Section title="Client">
        <Select
          label="Client"
          value={clientId}
          onChange={setClientId}
          options={clients.map((c) => ({
            value: c.id,
            label: c.company_name ? `${c.name} — ${c.company_name}` : c.name,
          }))}
          placeholder="Choose a client…"
          required
        />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
          <Select
            label="Linked quote"
            value={quoteId}
            onChange={setQuoteId}
            options={quotes.map((q) => ({ value: q.id, label: q.quote_number }))}
            placeholder="None"
          />
          <Select
            label="Linked invoice"
            value={invoiceId}
            onChange={setInvoiceId}
            options={invoices.map((i) => ({ value: i.id, label: i.invoice_number }))}
            placeholder="None"
          />
        </div>
      </Section>

      {/* Job Details */}
      <Section title="Job Details">
        <Field label="Title" value={title} onChange={setTitle} placeholder="e.g. Weekly clean — Smith residence" />
        <TextArea label="Description" value={description} onChange={setDescription} className="mt-4" />
        <Field label="Address" value={address} onChange={setAddress} className="mt-4" />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4">
          <Field label="Scheduled date" type="date" value={scheduledDate} onChange={setScheduledDate} />
          <Field label="Scheduled time" value={scheduledTime} onChange={setScheduledTime} placeholder="e.g. 9:00am" />
          <Field label="Duration estimate" value={durationEstimate} onChange={setDurationEstimate} placeholder="e.g. 3 hours" />
        </div>
      </Section>

      {/* Contractor */}
      <Section title="Pricing &amp; Assignment">
        <Field label="Job price — client ($)" type="number" step="0.01" min="0" value={jobPrice} onChange={setJobPrice} />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
          <Select
            label="Assigned contractor"
            value={contractorId}
            onChange={handleContractorSelect}
            options={contractors.map((c) => ({ value: c.id, label: c.full_name }))}
            placeholder="Unassigned"
          />
          <Field label="Contractor price ($)" type="number" step="0.01" min="0" value={contractorPrice} onChange={setContractorPrice} />
        </div>
      </Section>

      {/* Notes */}
      <Section title="Notes">
        <TextArea label="Internal notes" value={internalNotes} onChange={setInternalNotes} placeholder="Staff-only notes…" />
        {isEdit && (
          <TextArea label="Contractor notes" value={contractorNotes} onChange={setContractorNotes} placeholder="Notes for or from contractor…" className="mt-4" />
        )}
      </Section>

      {/* Error + Submit */}
      {error && (
        <p className="text-red-600 text-sm bg-red-50 rounded-lg px-4 py-3">{error}</p>
      )}

      <div className="flex items-center gap-4">
        <button
          type="submit"
          disabled={isPending}
          className="bg-sage-500 text-white font-semibold px-6 py-3 rounded-lg hover:bg-sage-700 transition-colors disabled:opacity-50"
        >
          {isPending ? 'Saving…' : isEdit ? 'Save Changes' : 'Save Job'}
        </button>
        <a href={isEdit ? `/portal/jobs/${job!.id}` : '/portal/jobs'} className="text-sm text-sage-600 hover:text-sage-800 transition-colors">
          Cancel
        </a>
      </div>
    </form>
  )
}

// ── Form primitives ─────────────────────────────────────────

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
  type?: string; step?: string; min?: string; placeholder?: string
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

function TextArea({
  label, value, onChange, className, placeholder,
}: {
  label: string; value: string; onChange: (v: string) => void; className?: string; placeholder?: string
}) {
  return (
    <label className={clsx('block', className)}>
      <span className="block text-sm font-semibold text-sage-800 mb-1.5">{label}</span>
      <textarea
        rows={3}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-lg border border-sage-200 px-4 py-3 text-sage-800 placeholder:text-sage-300 focus:outline-none focus:ring-2 focus:ring-sage-500 focus:border-transparent text-sm resize-y"
      />
    </label>
  )
}

function Select({
  label, value, onChange, options, placeholder = 'Select…', required, className,
}: {
  label: string; value: string; onChange: (v: string) => void
  options: { value: string; label: string }[]
  placeholder?: string; required?: boolean; className?: string
}) {
  return (
    <label className={clsx('block', className)}>
      <span className="block text-sm font-semibold text-sage-800 mb-1.5">
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </span>
      <div className="relative">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full appearance-none rounded-lg border border-sage-200 px-4 py-3 pr-10 text-sage-800 focus:outline-none focus:ring-2 focus:ring-sage-500 focus:border-transparent text-sm bg-white"
        >
          <option value="">{placeholder}</option>
          {options.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
        <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-sage-400 pointer-events-none" />
      </div>
    </label>
  )
}
