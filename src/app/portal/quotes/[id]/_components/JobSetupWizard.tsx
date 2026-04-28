'use client'

// Phase 5.5.12 — Job-Setup wizard.
//
// Modal that runs after the operator clicks "Create Job" on an
// accepted quote. Captures:
//   1. Schedule         — date, time, duration, allowed hours
//   2. Site & contact   — address, access instructions, optional
//                         contact / site picker (defaults from quote)
//   3. Worker           — contractor, rate readout, estimated labour
//                         cost, estimated margin (admin internal only)
//   4. Payment          — inherited from quote / client; override path
//                         when prepaid and operator wants to proceed
//   5. Notes & scope    — operational scope hints (occupancy, pets,
//                         parking, stairs, condition) + internal notes
//
// On submit calls createJobFromQuoteWithSetup which inserts the job
// and redirects. Cancel closes the modal without side effects.

import { useEffect, useRef, useState, useTransition } from 'react'
import { X, Calendar, MapPin, User, CreditCard, FileText } from 'lucide-react'
import {
  createJobFromQuoteWithSetup,
  listAssignableContractors,
} from '../_actions-job-setup'
import type { JobSetupInput, ReadyContractor } from '../_lib-job-setup'

export interface JobSetupSeed {
  quoteId: string
  // Quote-side hints used to pre-fill the wizard.
  serviceAddress: string | null
  scheduledCleanDate: string | null
  estimatedHours: number | null
  // Phase 5.5.16 — operator's allotment from the quote, if set.
  // Wizard prefills this; falls back to estimatedHours.
  allowedHours?: number | null
  paymentType: 'cash_sale' | 'on_account' | null  // quote.payment_type
  basePrice: number | null
  contactId: string | null
  siteId: string | null
  notes: string | null
  // Existing scope hints already on the quote (5.5.12 added these).
  occupancy: string | null
  pets: string | null
  parking: string | null
  stairs: string | null
  conditionLevel: string | null
  accessNotes: string | null
}

interface Props {
  seed: JobSetupSeed
  onCancel: () => void
}

const PARKING_OPTIONS = [
  { value: '',             label: '— Not specified —' },
  { value: 'on_site',      label: 'On site' },
  { value: 'street',       label: 'Street' },
  { value: 'paid_nearby',  label: 'Paid nearby' },
  { value: 'difficult',    label: 'Difficult' },
]
const STAIRS_OPTIONS = [
  { value: '',            label: '— Not specified —' },
  { value: 'none',        label: 'None / single level' },
  { value: 'one_flight',  label: '1 flight' },
  { value: 'multi_level', label: 'Multi-level' },
]
const CONDITION_OPTIONS = [
  { value: '',         label: '— Not specified —' },
  { value: 'tidy',     label: 'Tidy' },
  { value: 'lived_in', label: 'Lived-in' },
  { value: 'dirty',    label: 'Dirty' },
  { value: 'extreme',  label: 'Extreme' },
]
const OCCUPANCY_OPTIONS = [
  { value: '',         label: '— Not specified —' },
  { value: 'occupied', label: 'Occupied' },
  { value: 'vacant',   label: 'Vacant' },
]

export function JobSetupWizard({ seed, onCancel }: Props) {
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  // Schedule
  const [scheduledDate,     setScheduledDate]     = useState<string>(seed.scheduledCleanDate ?? '')
  const [scheduledTime,     setScheduledTime]     = useState<string>('')
  const [durationEstimate,  setDurationEstimate]  = useState<string>('')
  // Phase 5.5.16 — prefer the operator's allotment (quote.allowed_hours)
  // over the engine's estimate. Wizard can still override per-job.
  const [allowedHours,      setAllowedHours]      = useState<string>(() => {
    const fromQuote = seed.allowedHours ?? seed.estimatedHours
    return fromQuote != null ? String(fromQuote) : ''
  })

  // Site & contact
  const [address,            setAddress]            = useState<string>(seed.serviceAddress ?? '')
  const [accessInstructions, setAccessInstructions] = useState<string>(seed.accessNotes ?? '')

  // Worker
  const [contractors, setContractors] = useState<ReadyContractor[]>([])
  const [contractorId, setContractorId] = useState<string>('')
  const [contractorPrice, setContractorPrice] = useState<string>('') // hourly override
  const fetchedContractors = useRef(false)
  useEffect(() => {
    if (fetchedContractors.current) return
    fetchedContractors.current = true
    ;(async () => {
      try {
        const list = await listAssignableContractors()
        setContractors(list)
      } catch (err) {
        console.warn('[JobSetupWizard] contractor list failed:', err)
      }
    })()
  }, [])
  const selectedWorker = contractors.find((c) => c.id === contractorId) ?? null
  const effectiveRate = selectedWorker
    ? (Number.isFinite(parseFloat(contractorPrice))
        ? parseFloat(contractorPrice)
        : (selectedWorker.hourly_rate ?? selectedWorker.base_hourly_rate ?? null))
    : null
  const allowedHoursNum = parseFloat(allowedHours)
  const validHours = Number.isFinite(allowedHoursNum) && allowedHoursNum > 0

  const labourCost = (validHours && effectiveRate != null)
    ? allowedHoursNum * effectiveRate
    : null
  const margin = (labourCost != null && seed.basePrice != null)
    ? seed.basePrice - labourCost
    : null

  // Payment
  const isPrepaid = seed.paymentType === 'cash_sale'
  const [allowOverride, setAllowOverride] = useState(false)
  const [overrideReason, setOverrideReason] = useState('')

  // Scope hints
  const [occupancy,      setOccupancy]      = useState<string>(seed.occupancy ?? '')
  const [pets,           setPets]           = useState<string>(seed.pets ?? '')
  const [parking,        setParking]        = useState<string>(seed.parking ?? '')
  const [stairs,         setStairs]         = useState<string>(seed.stairs ?? '')
  const [conditionLevel, setConditionLevel] = useState<string>(seed.conditionLevel ?? '')
  const [internalNotes,  setInternalNotes]  = useState<string>('')

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (isPrepaid && allowOverride && !overrideReason.trim()) {
      setError('Please add a short reason for the prepayment exception.')
      return
    }
    if (selectedWorker && selectedWorker.status !== 'active') {
      setError('Pick an active worker, leave unassigned, or finish that worker’s onboarding first.')
      return
    }

    const setup: JobSetupInput = {
      scheduled_date:     scheduledDate || null,
      scheduled_time:     scheduledTime || null,
      duration_estimate:  durationEstimate || null,
      allowed_hours:      validHours ? allowedHoursNum : (seed.allowedHours ?? seed.estimatedHours ?? null),
      contractor_id:      contractorId || null,
      contractor_price:   Number.isFinite(parseFloat(contractorPrice)) ? parseFloat(contractorPrice) : null,
      contact_id:         seed.contactId,
      site_id:            seed.siteId,
      address:            address.trim() || null,
      access_instructions: accessInstructions.trim() || null,
      internal_notes:     internalNotes.trim() || null,
      occupancy:          occupancy || null,
      pets:               pets.trim() || null,
      parking:            parking || null,
      stairs:             stairs || null,
      condition_level:    conditionLevel || null,
      payment_override:   isPrepaid && allowOverride
        ? { allow: true, reason: overrideReason.trim() }
        : { allow: false },
    }

    startTransition(async () => {
      try {
        const r = await createJobFromQuoteWithSetup(seed.quoteId, setup)
        if (r && 'error' in r) setError(r.error)
        // Success path redirects via NEXT_REDIRECT — execution does
        // not return here. Anything else is an error to display.
      } catch (err) {
        // NEXT_REDIRECT is what Next.js throws on success — re-throw
        // it so the redirect actually happens.
        if (err && typeof err === 'object' && 'digest' in err
            && typeof (err as { digest: unknown }).digest === 'string'
            && (err as { digest: string }).digest.startsWith('NEXT_REDIRECT')) {
          throw err
        }
        const msg = err instanceof Error ? err.message : 'Failed to create job.'
        setError(msg)
      }
    })
  }

  return (
    <div
      className="fixed inset-0 z-50 bg-black/40 flex items-start justify-center p-4 overflow-y-auto"
      onClick={() => !pending && onCancel()}
    >
      <div
        className="bg-white rounded-2xl shadow-xl w-full max-w-2xl my-8 p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-1">
          <h2 className="text-xl font-bold text-sage-800">Create job from quote</h2>
          <button type="button" onClick={onCancel} aria-label="Close" className="text-sage-400 hover:text-sage-700">
            <X size={20} />
          </button>
        </div>
        <p className="text-xs text-sage-500 mb-5">
          Fill in the operational details so the job is ready to schedule and assign. You can edit any of this later on the job detail page.
        </p>

        <form onSubmit={handleSubmit} className="space-y-7">
          {/* Section 1 — Schedule */}
          <Section title="Schedule" icon={<Calendar size={14} className="text-sage-500" />}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Job date" type="date" value={scheduledDate} onChange={setScheduledDate} />
              <Field label="Start time" value={scheduledTime} onChange={setScheduledTime} placeholder="e.g. 8:30 AM" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Estimated duration" value={durationEstimate} onChange={setDurationEstimate} placeholder="e.g. 3.5 hrs" />
              <Field
                label="Allowed hours"
                type="number"
                value={allowedHours}
                onChange={setAllowedHours}
                placeholder="for labour planning"
                hint={seed.estimatedHours != null ? `Quote estimate: ${seed.estimatedHours} hr` : null}
              />
            </div>
          </Section>

          {/* Section 2 — Site & contact */}
          <Section title="Site & contact" icon={<MapPin size={14} className="text-sage-500" />}>
            <Field label="Service address" value={address} onChange={setAddress} placeholder="Defaults to quote address" />
            <TextArea label="Access instructions" value={accessInstructions} onChange={setAccessInstructions} placeholder="Keys, alarm code, parking, etc." />
          </Section>

          {/* Section 3 — Worker */}
          <Section title="Worker assignment" icon={<User size={14} className="text-sage-500" />}>
            <SelectField
              label="Assign worker"
              value={contractorId}
              onChange={setContractorId}
              options={[
                { value: '', label: '— Leave unassigned —' },
                ...contractors.map((c) => ({
                  value: c.id,
                  label:
                    c.full_name +
                    (c.status === 'pending_onboarding' ? ' · pending onboarding' : '') +
                    (c.status === 'inactive' ? ' · inactive' : ''),
                  disabled: c.status !== 'active',
                })),
              ]}
            />
            {selectedWorker && selectedWorker.status !== 'active' && (
              <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                <strong>Not ready for job assignment.</strong> {selectedWorker.blocker ?? 'Complete onboarding and trial requirements first.'}
              </p>
            )}
            {selectedWorker && selectedWorker.status === 'active' && (
              <Field
                label={`Hourly rate (override)${selectedWorker.hourly_rate != null ? ` — default $${selectedWorker.hourly_rate}/hr` : ''}`}
                type="number"
                value={contractorPrice}
                onChange={setContractorPrice}
                placeholder={selectedWorker.hourly_rate != null ? String(selectedWorker.hourly_rate) : 'e.g. 35'}
                hint={
                  effectiveRate == null
                    ? 'Rate not set — defaults will need configuring on the contractor profile.'
                    : null
                }
              />
            )}
            {selectedWorker && selectedWorker.status === 'active' && (
              <InternalCostReadout
                clientPrice={seed.basePrice}
                allowedHours={validHours ? allowedHoursNum : null}
                workerRate={effectiveRate}
                labourCost={labourCost}
                margin={margin}
              />
            )}
          </Section>

          {/* Section 4 — Payment */}
          <Section title="Payment" icon={<CreditCard size={14} className="text-sage-500" />}>
            {isPrepaid ? (
              <div className="space-y-2">
                <p className="text-sm text-sage-700 bg-sage-50 border border-sage-100 rounded-lg px-3 py-2">
                  <strong>Prepaid</strong> — payment is required to confirm this booking. The job will be created in <span className="font-mono">draft</span> status with payment_status <span className="font-mono">payment_pending</span> until the customer pays.
                </p>
                <label className="flex items-start gap-2 mt-1 cursor-pointer">
                  <input type="checkbox" checked={allowOverride} onChange={(e) => setAllowOverride(e.target.checked)} className="accent-sage-500 mt-0.5" />
                  <span className="text-sm text-sage-700">Allow this job to proceed without prepayment</span>
                </label>
                {allowOverride && (
                  <TextArea
                    label="Reason (audited)"
                    value={overrideReason}
                    onChange={setOverrideReason}
                    required
                    placeholder="e.g. Existing client, agreed to invoice on completion."
                  />
                )}
              </div>
            ) : (
              <p className="text-sm text-sage-700 bg-sage-50 border border-sage-100 rounded-lg px-3 py-2">
                <strong>On account</strong> — invoice will be issued after the service. Payment terms inherit from the client.
              </p>
            )}
          </Section>

          {/* Section 5 — Notes & scope hints */}
          <Section title="Notes & scope hints" icon={<FileText size={14} className="text-sage-500" />}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <SelectField label="Occupancy"      value={occupancy}      onChange={setOccupancy}      options={OCCUPANCY_OPTIONS} />
              <Field       label="Pets"           value={pets}           onChange={setPets}           placeholder="None / 1 cat / 2 dogs" />
              <SelectField label="Parking"        value={parking}        onChange={setParking}        options={PARKING_OPTIONS} />
              <SelectField label="Stairs / levels" value={stairs}        onChange={setStairs}         options={STAIRS_OPTIONS} />
              <SelectField label="Condition"      value={conditionLevel} onChange={setConditionLevel} options={CONDITION_OPTIONS} />
            </div>
            <TextArea label="Internal notes" value={internalNotes} onChange={setInternalNotes} placeholder="For the operations team — not shared with the client." />
          </Section>

          {error && (
            <p className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">{error}</p>
          )}

          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onCancel}
              disabled={pending}
              className="px-4 py-2.5 rounded-lg text-sm text-sage-700 hover:bg-gray-100 disabled:opacity-50 min-h-[44px]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={pending}
              className="bg-sage-500 text-white font-semibold px-5 py-2.5 rounded-lg text-sm hover:bg-sage-700 transition-colors disabled:opacity-50 min-h-[44px]"
            >
              {pending ? 'Creating job…' : 'Create job'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Internal cost readout (admin-internal — never sent to contractor)
function InternalCostReadout({
  clientPrice, allowedHours, workerRate, labourCost, margin,
}: {
  clientPrice: number | null
  allowedHours: number | null
  workerRate: number | null
  labourCost: number | null
  margin: number | null
}) {
  function fmt(n: number | null): string {
    if (n == null) return '—'
    return new Intl.NumberFormat('en-NZ', { style: 'currency', currency: 'NZD' }).format(n)
  }
  return (
    <div className="bg-sage-50 border border-sage-100 rounded-lg p-3 text-xs space-y-1">
      <div className="font-semibold text-sage-700 mb-1.5">Internal cost (not visible to contractor)</div>
      <Row label="Client price"          value={fmt(clientPrice)} />
      <Row label="Allowed hours"         value={allowedHours != null ? `${allowedHours} hr` : '—'} />
      <Row label="Worker rate"           value={workerRate != null ? `${fmt(workerRate)}/hr` : 'Rate not set'} />
      <Row label="Estimated labour cost" value={fmt(labourCost)} />
      <Row
        label="Estimated margin"
        value={
          margin == null ? '—'
          : margin < 0   ? <span className="text-red-700 font-semibold">{fmt(margin)}</span>
          :                <span className="text-emerald-700 font-semibold">{fmt(margin)}</span>
        }
      />
    </div>
  )
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-sage-500">{label}</span>
      <span className="text-sage-800 font-mono tabular-nums">{value}</span>
    </div>
  )
}

// ── Form primitives ───────────────────────────────────────────────

function Section({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <fieldset className="space-y-3">
      <legend className="flex items-center gap-2 text-sm font-semibold text-sage-800">
        {icon}{title}
      </legend>
      {children}
    </fieldset>
  )
}

function Field({
  label, type = 'text', value, onChange, placeholder, hint, required,
}: {
  label: string
  type?: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
  hint?: string | null
  required?: boolean
}) {
  return (
    <label className="block">
      <span className="block text-xs font-semibold text-sage-700 uppercase tracking-wide mb-1.5">
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        required={required}
        className="w-full rounded-lg border border-sage-200 px-4 py-2.5 text-sm text-sage-800 placeholder:text-sage-300 focus:outline-none focus:ring-2 focus:ring-sage-500 focus:border-transparent"
      />
      {hint && <p className="text-xs text-sage-500 mt-1">{hint}</p>}
    </label>
  )
}

function TextArea({
  label, value, onChange, placeholder, required,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
  required?: boolean
}) {
  return (
    <label className="block">
      <span className="block text-xs font-semibold text-sage-700 uppercase tracking-wide mb-1.5">
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </span>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={3}
        required={required}
        className="w-full rounded-lg border border-sage-200 px-4 py-2.5 text-sm text-sage-800 placeholder:text-sage-300 focus:outline-none focus:ring-2 focus:ring-sage-500 focus:border-transparent resize-y"
      />
    </label>
  )
}

function SelectField({
  label, value, onChange, options,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  options: { value: string; label: string; disabled?: boolean }[]
}) {
  return (
    <label className="block">
      <span className="block text-xs font-semibold text-sage-700 uppercase tracking-wide mb-1.5">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg border border-sage-200 px-3 py-2.5 text-sm text-sage-800 bg-white focus:outline-none focus:ring-2 focus:ring-sage-500"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value} disabled={o.disabled}>{o.label}</option>
        ))}
      </select>
    </label>
  )
}
