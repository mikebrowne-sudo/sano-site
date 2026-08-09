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
  contractor_pay_type?: string | null
  assigned_to: string | null
  contractor_price: number | null
  frequency: string
  start_date: string
  end_date: string | null
  status: string
  monthly_value?: number | null
  invoice_auto_send?: boolean | null
  invoice_send_day?: number | null
  contractor_monthly_pay?: number | null
  billing_mode?: string | null
  per_visit_rate?: number | null
  service_days_of_week?: number[] | null
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
  const [contractorPayType, setContractorPayType] = useState(recurringJob?.contractor_pay_type ?? 'hourly')
  const [assignedTo, setAssignedTo] = useState(recurringJob?.assigned_to ?? '')
  const [contractorPrice, setContractorPrice] = useState(recurringJob?.contractor_price != null ? String(recurringJob.contractor_price) : '')
  const [frequency, setFrequency] = useState(recurringJob?.frequency ?? 'weekly')
  const [startDate, setStartDate] = useState(recurringJob?.start_date ?? '')
  const [endDate, setEndDate] = useState(recurringJob?.end_date ?? '')
  const [status, setStatus] = useState(recurringJob?.status ?? 'active')
  const [monthlyValue, setMonthlyValue] = useState(recurringJob?.monthly_value != null ? String(recurringJob.monthly_value) : '')
  const [billingMode, setBillingMode] = useState<'fixed' | 'per_visit'>((recurringJob?.billing_mode as 'fixed' | 'per_visit') ?? 'fixed')
  const [perVisitRate, setPerVisitRate] = useState(recurringJob?.per_visit_rate != null ? String(recurringJob.per_visit_rate) : '')
  const [serviceDays, setServiceDays] = useState<Set<number>>(new Set(recurringJob?.service_days_of_week ?? []))
  const [invoiceSendDay, setInvoiceSendDay] = useState(recurringJob?.invoice_send_day != null ? String(recurringJob.invoice_send_day) : '')
  const [invoiceAutoSend, setInvoiceAutoSend] = useState(recurringJob?.invoice_auto_send ?? false)
  const [contractorMonthlyPay, setContractorMonthlyPay] = useState(recurringJob?.contractor_monthly_pay != null ? String(recurringJob.contractor_monthly_pay) : '')

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
      contractor_pay_type: contractorPayType || 'hourly',
      assigned_to: assignedTo.trim() || undefined,
      contractor_price: toNum(contractorPrice),
      frequency,
      start_date: startDate,
      end_date: endDate || undefined,
      status,
      monthly_value: toNum(monthlyValue),
      contractor_monthly_pay: toNum(contractorMonthlyPay),
      invoice_send_day: toNum(invoiceSendDay),
      invoice_auto_send: invoiceAutoSend,
      billing_mode: billingMode,
      per_visit_rate: billingMode === 'per_visit' ? toNum(perVisitRate) : undefined,
      service_days_of_week: billingMode === 'per_visit' ? Array.from(serviceDays).sort() : undefined,
    }

    if (billingMode === 'per_visit') {
      if (!(Number(perVisitRate) > 0)) { setError('Per-visit rate is required for per-visit billing.'); return }
      if (serviceDays.size === 0) { setError('Pick the service days for per-visit billing.'); return }
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
        {contractorId && (
          <div className="mt-4 max-w-xs">
            <Select label="Contractor pay basis" value={contractorPayType} onChange={setContractorPayType} options={[{ value: 'hourly', label: 'Hourly / allocated hours' }, { value: 'fixed', label: 'Fixed per occurrence' }]} />
          </div>
        )}
      </Section>

      {/* Invoicing */}
      <Section title="Invoicing">
        {/* Billing mode */}
        <div className="mb-4">
          <span className="block text-sm font-semibold text-sage-800 mb-1.5">Billing</span>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => setBillingMode('fixed')} className={clsx('px-3 py-1.5 rounded-md text-sm font-medium border', billingMode === 'fixed' ? 'bg-sage-600 text-white border-sage-600' : 'bg-white text-sage-600 border-sage-200 hover:border-sage-300')}>Fixed monthly</button>
            <button type="button" onClick={() => setBillingMode('per_visit')} className={clsx('px-3 py-1.5 rounded-md text-sm font-medium border', billingMode === 'per_visit' ? 'bg-sage-600 text-white border-sage-600' : 'bg-white text-sage-600 border-sage-200 hover:border-sage-300')}>Per visit</button>
          </div>
          <span className="block text-[11px] text-sage-500 mt-1.5">
            {billingMode === 'fixed'
              ? 'Same amount every month (the monthly value below).'
              : 'The invoice = rate per visit × the number of service days in that month, so it varies month to month.'}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {billingMode === 'fixed' ? (
            <Field label="Monthly value ($)" type="number" step="0.01" min="0" value={monthlyValue} onChange={setMonthlyValue} placeholder="e.g. 2740" />
          ) : (
            <Field label="Rate per visit ($, ex GST)" type="number" step="0.01" min="0" value={perVisitRate} onChange={setPerVisitRate} placeholder="e.g. 100" />
          )}
          <Field label="Invoice on day of month (1–31; 31 = end of month)" type="number" min="1" value={invoiceSendDay} onChange={setInvoiceSendDay} placeholder="e.g. 1" />
          <Field label="Contractor monthly pay ($)" type="number" step="0.01" min="0" value={contractorMonthlyPay} onChange={setContractorMonthlyPay} placeholder="e.g. 1500" />
        </div>

        {billingMode === 'per_visit' && (
          <div className="mt-4">
            <span className="block text-sm font-semibold text-sage-800 mb-1.5">Service days</span>
            <div className="flex flex-wrap gap-2">
              {[{ d: 1, l: 'Mon' }, { d: 2, l: 'Tue' }, { d: 3, l: 'Wed' }, { d: 4, l: 'Thu' }, { d: 5, l: 'Fri' }, { d: 6, l: 'Sat' }, { d: 7, l: 'Sun' }].map(({ d, l }) => {
                const on = serviceDays.has(d)
                return (
                  <button type="button" key={d}
                    onClick={() => setServiceDays((prev) => { const n = new Set(prev); if (n.has(d)) n.delete(d); else n.add(d); return n })}
                    className={clsx('px-3 py-1.5 rounded-md text-sm font-medium border', on ? 'bg-sage-600 text-white border-sage-600' : 'bg-white text-sage-600 border-sage-200 hover:border-sage-300')}
                  >{l}</button>
                )
              })}
            </div>
            <span className="block text-[11px] text-sage-500 mt-1.5">Which days the clean happens. The invoice counts these in the billing month × the rate.</span>
          </div>
        )}
        <label className="flex items-start gap-2 mt-4 text-sm text-sage-700">
          <input type="checkbox" checked={invoiceAutoSend} onChange={(e) => setInvoiceAutoSend(e.target.checked)} className="mt-0.5 rounded border-sage-300" />
          <span>
            Auto-send the invoice to the client
            <span className="block text-[11px] text-sage-400">Leave off to raise a <span className="font-medium">draft</span> each month (it lands in your To-do to review + send). Turn on to email it automatically on the invoice day.</span>
          </span>
        </label>
        <p className="text-[11px] text-sage-400 mt-2">
          With a monthly value + invoice day set, the monthly invoice is raised automatically — no per-month clicking.
        </p>
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
