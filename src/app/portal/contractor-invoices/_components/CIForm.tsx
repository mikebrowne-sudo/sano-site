'use client'

import { useState, useTransition } from 'react'
import { createContractorInvoice } from '../_actions'
import { updateContractorPayable } from '../_actions-payable-edit'
import { ChevronDown } from 'lucide-react'

interface Contractor { id: string; full_name: string }
interface JobOption { id: string; job_number: string; title: string | null }

interface CIData {
  id?: string
  contractor_id: string
  job_id: string | null
  amount: number
  date_submitted: string
  notes: string | null
  payment_type?: string | null
  site_label?: string | null
  period_label?: string | null
}

export function CIForm({ ci, contractors, jobs }: { ci?: CIData; contractors: Contractor[]; jobs: JobOption[] }) {
  const isEdit = !!ci?.id

  const [contractorId, setContractorId] = useState(ci?.contractor_id ?? '')
  const [jobId, setJobId] = useState(ci?.job_id ?? '')
  const [amount, setAmount] = useState(ci?.amount ? String(ci.amount) : '')
  const [dateSubmitted, setDateSubmitted] = useState(ci?.date_submitted ?? new Date().toISOString().slice(0, 10))
  const [gstSupplyDate, setGstSupplyDate] = useState(ci?.date_submitted ?? new Date().toISOString().slice(0, 10))
  const [notes, setNotes] = useState(ci?.notes ?? '')
  const [paymentType, setPaymentType] = useState(ci?.payment_type ?? 'standard')
  const [siteLabel, setSiteLabel] = useState(ci?.site_label ?? '')
  const [periodLabel, setPeriodLabel] = useState(ci?.period_label ?? '')
  const [reason, setReason] = useState('')

  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [duplicateMsg, setDuplicateMsg] = useState<string | null>(null)

  const isFixed = paymentType === 'fixed_contract'

  function submit(force: boolean) {
    setError(null)
    setDuplicateMsg(null)
    if (!contractorId) { setError('Contractor is required.'); return }
    const amt = parseFloat(amount)
    if (!amt || amt <= 0) { setError('Amount must be greater than zero.'); return }
    if (isFixed && !siteLabel.trim()) { setError('Site/client is required for a fixed contract payment.'); return }
    if (isEdit && !reason.trim()) { setError('A reason is required to edit a contractor payable.'); return }

    startTransition(async () => {
      const result = isEdit
        ? await updateContractorPayable({
            id: ci!.id!,
            contractor_id: contractorId,
            job_id: jobId || null,
            amount: amt,
            date_submitted: dateSubmitted,
            notes: notes.trim() || null,
            payment_type: paymentType,
            site_label: siteLabel.trim() || null,
            period_label: periodLabel.trim() || null,
            reason: reason.trim(),
          })
        : await createContractorInvoice({
            contractor_id: contractorId,
            job_id: jobId || undefined,
            amount: amt,
            date_submitted: dateSubmitted,
            gst_supply_date: gstSupplyDate,
            notes: notes.trim() || undefined,
            payment_type: paymentType,
            site_label: siteLabel.trim() || null,
            period_label: periodLabel.trim() || null,
            force,
          })
      if (result && 'duplicate' in result && result.duplicate) { setDuplicateMsg(result.message ?? 'A similar fixed payment already exists.'); return }
      if (result && 'error' in result && result.error) { setError(result.error); return }
      if (isEdit) window.location.href = `/portal/contractor-invoices/${ci!.id}`
    })
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    submit(false)
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-2xl space-y-8">
      <Section title="Details">
        <div className="mb-4">
          <Sel label="Payment type" value={paymentType} onChange={setPaymentType} options={[{ value: 'standard', label: 'Standard' }, { value: 'fixed_contract', label: 'Fixed contract payment' }]} />
          {isFixed && <p className="text-xs text-sage-400 mt-1">Fixed contract payments use the amount entered below. A linked job is for reference and reporting only.</p>}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Sel label="Contractor" required value={contractorId} onChange={setContractorId} options={contractors.map((c) => ({ value: c.id, label: c.full_name }))} placeholder="Select contractor…" />
          <Sel label={isFixed ? 'Linked job (optional)' : 'Linked job'} value={jobId} onChange={setJobId} options={jobs.map((j) => ({ value: j.id, label: `${j.job_number}${j.title ? ` — ${j.title}` : ''}` }))} placeholder="None" />
        </div>
        {isFixed && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
            <label className="block">
              <span className="block text-sm font-semibold text-sage-800 mb-1.5">Site / client <span className="text-red-500">*</span></span>
              <input value={siteLabel} onChange={(e) => setSiteLabel(e.target.value)} placeholder="e.g. Pukekohe Golf Club" className="w-full rounded-lg border border-sage-200 px-4 py-3 text-sage-800 text-sm focus:outline-none focus:ring-2 focus:ring-sage-500" />
            </label>
            <label className="block">
              <span className="block text-sm font-semibold text-sage-800 mb-1.5">Period</span>
              <input value={periodLabel} onChange={(e) => setPeriodLabel(e.target.value)} placeholder="e.g. June 2026" className="w-full rounded-lg border border-sage-200 px-4 py-3 text-sage-800 text-sm focus:outline-none focus:ring-2 focus:ring-sage-500" />
            </label>
          </div>
        )}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
          <label className="block">
            <span className="block text-sm font-semibold text-sage-800 mb-1.5">Amount ($) <span className="text-red-500">*</span></span>
            <input type="number" step="0.01" min="0" value={amount} onChange={(e) => setAmount(e.target.value)} required className="w-full rounded-lg border border-sage-200 px-4 py-3 text-sage-800 text-sm focus:outline-none focus:ring-2 focus:ring-sage-500" />
            {isEdit && <span className="block text-xs text-sage-400 mt-1">This is the payable total. Hours/rate aren’t stored on a payable.</span>}
          </label>
          <label className="block">
            <span className="block text-sm font-semibold text-sage-800 mb-1.5">Date submitted</span>
            <input type="date" value={dateSubmitted} onChange={(e) => setDateSubmitted(e.target.value)} className="w-full rounded-lg border border-sage-200 px-4 py-3 text-sage-800 text-sm focus:outline-none focus:ring-2 focus:ring-sage-500" />
          </label>
          {!isEdit && (
            <label className="block">
              <span className="block text-sm font-semibold text-sage-800 mb-1.5">GST supply date</span>
              <input type="date" value={gstSupplyDate} onChange={(e) => setGstSupplyDate(e.target.value)} className="w-full rounded-lg border border-sage-200 px-4 py-3 text-sage-800 text-sm focus:outline-none focus:ring-2 focus:ring-sage-500" />
              <span className="block text-xs text-sage-400 mt-1">{isFixed ? 'Use the service-period end date for a fixed-contract period.' : 'Date the work was supplied — used to determine GST. Defaults to the date submitted; confirm or change it.'}</span>
            </label>
          )}
        </div>
      </Section>

      <Section title="Notes">
        <textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Invoice notes…" className="w-full rounded-lg border border-sage-200 px-4 py-3 text-sage-800 placeholder:text-sage-300 text-sm resize-y focus:outline-none focus:ring-2 focus:ring-sage-500" />
      </Section>

      {isEdit && (
        <Section title="Reason for change">
          <input value={reason} onChange={(e) => setReason(e.target.value)} required placeholder="e.g. corrected agreed amount with contractor" className="w-full rounded-lg border border-sage-200 px-4 py-3 text-sage-800 placeholder:text-sage-300 text-sm focus:outline-none focus:ring-2 focus:ring-sage-500" />
          <p className="text-xs text-sage-400 mt-1.5">Required. Saved to the audit log. Editing does not mark the payable paid/unpaid, and does not change any remittance.</p>
        </Section>
      )}

      {duplicateMsg && (
        <div className="text-amber-800 text-sm bg-amber-50 border border-amber-200 rounded-lg px-4 py-3">
          <p>{duplicateMsg}</p>
          <div className="flex items-center gap-3 mt-2">
            <button type="button" onClick={() => submit(true)} disabled={isPending} className="bg-amber-600 text-white font-medium px-4 py-2 rounded-lg text-xs hover:bg-amber-700 disabled:opacity-50">Create anyway</button>
            <button type="button" onClick={() => setDuplicateMsg(null)} className="text-xs text-sage-600 hover:text-sage-800">Cancel</button>
          </div>
        </div>
      )}

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
