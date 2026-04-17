'use client'

import { useState, useTransition } from 'react'
import { updateQuote } from '../_actions'
import { AddressField } from '../../../_components/AddressField'
import { Plus, Trash2, ChevronDown } from 'lucide-react'
import clsx from 'clsx'

// ── Option lists ────────────────────────────��─────────────────

const PROPERTY_TYPES = ['Residential', 'Commercial', 'Specialised']

const CLEAN_TYPES: Record<string, string[]> = {
  Residential: [
    'Regular Cleaning',
    'Deep Cleaning',
    'End of Tenancy',
    'Move-in Clean',
    'Spring Clean',
  ],
  Commercial: [
    'Office Cleaning',
    'Commercial Cleaning',
    'Retail Cleaning',
    'Medical / Clinic',
  ],
  Specialised: [
    'Carpet & Upholstery',
    'Window Cleaning',
    'Post-Construction',
    'High-Access Cleaning',
  ],
}

const SERVICE_TYPES: Record<string, string[]> = {
  'Regular Cleaning':       ['Standard', 'Premium'],
  'Deep Cleaning':          ['Full House', 'Kitchen & Bathrooms Only', 'Specific Rooms'],
  'End of Tenancy':         ['Standard Bond Clean', 'Full Property'],
  'Move-in Clean':          ['Pre-Move Clean', 'Full Sanitise'],
  'Spring Clean':           ['Interior Only', 'Interior + Exterior'],
  'Office Cleaning':        ['Daily', 'Weekly', 'Fortnightly'],
  'Commercial Cleaning':    ['Standard', 'After-Hours'],
  'Retail Cleaning':        ['Opening Hours', 'After-Hours'],
  'Medical / Clinic':       ['Standard', 'Infection Control'],
  'Carpet & Upholstery':    ['Carpet Only', 'Upholstery Only', 'Carpet + Upholstery'],
  'Window Cleaning':        ['Interior', 'Exterior', 'Interior + Exterior'],
  'Post-Construction':      ['Builders Clean', 'Final Clean', 'Full Scope'],
  'High-Access Cleaning':   ['Standard', 'Specialist Equipment'],
}

const FREQUENCIES = ['One-off', 'Weekly', 'Fortnightly', 'Monthly']

const SCOPE_SIZES = [
  'Studio / 1 bedroom',
  '2 bedrooms',
  '3 bedrooms',
  '4+ bedrooms',
  'Small office',
  'Medium office',
  'Large / warehouse',
]

const STATUSES = [
  { value: 'draft', label: 'Draft' },
  { value: 'sent', label: 'Sent' },
  { value: 'accepted', label: 'Accepted' },
  { value: 'declined', label: 'Declined' },
]

const STATUS_STYLES: Record<string, string> = {
  draft:    'bg-gray-100 text-gray-700',
  sent:     'bg-blue-50 text-blue-700',
  accepted: 'bg-emerald-50 text-emerald-700',
  declined: 'bg-red-50 text-red-700',
}

// ── Types ─────────────────────────────────────────────────────

interface Client {
  id: string
  name: string
  company_name: string | null
}

interface QuoteItem {
  id: string
  label: string
  price: number
  sort_order: number
}

interface Quote {
  id: string
  quote_number: string
  client_id: string
  status: string
  property_category: string | null
  type_of_clean: string | null
  service_type: string | null
  frequency: string | null
  scope_size: string | null
  service_address: string | null
  preferred_dates: string | null
  scheduled_clean_date: string | null
  notes: string | null
  base_price: number
  discount: number
  gst_included: boolean
  payment_type: string
  date_issued: string | null
  valid_until: string | null
  created_at: string
}

interface Addon {
  key: string
  label: string
  price: string
}

// ── Helpers ───────────────────────────────────────────────────

function toNum(v: string) {
  const n = parseFloat(v)
  return Number.isFinite(n) ? n : 0
}

function formatNZD(dollars: number) {
  return new Intl.NumberFormat('en-NZ', { style: 'currency', currency: 'NZD' }).format(dollars)
}

function formatDate(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-NZ', { day: 'numeric', month: 'short', year: 'numeric' })
}

// ── Component ───────────────────────────────��─────────────────

export function EditQuoteForm({
  quote,
  clients,
  items,
}: {
  quote: Quote
  clients: Client[]
  items: QuoteItem[]
}) {
  // Client
  const [clientId, setClientId] = useState(quote.client_id)

  // Status + dates
  const [status, setStatus] = useState(quote.status)
  const [dateIssued, setDateIssued] = useState(quote.date_issued ?? '')
  const [validUntil, setValidUntil] = useState(quote.valid_until ?? '')

  // Service details
  const [propertyCategory, setPropertyCategory] = useState(quote.property_category ?? '')
  const [typeOfClean, setTypeOfClean] = useState(quote.type_of_clean ?? '')
  const [serviceType, setServiceType] = useState(quote.service_type ?? '')
  const [frequency, setFrequency] = useState(quote.frequency ?? '')
  const [scopeSize, setScopeSize] = useState(quote.scope_size ?? '')
  const [serviceAddress, setServiceAddress] = useState(quote.service_address ?? '')
  const [preferredDates, setPreferredDates] = useState(quote.preferred_dates ?? '')
  const [scheduledCleanDate, setScheduledCleanDate] = useState(quote.scheduled_clean_date ?? '')
  const [notes, setNotes] = useState(quote.notes ?? '')

  // Pricing
  const [basePrice, setBasePrice] = useState(String(quote.base_price || ''))
  const [discount, setDiscount] = useState(String(quote.discount || ''))
  const [gstIncluded, setGstIncluded] = useState(quote.gst_included)
  const [paymentType, setPaymentType] = useState(quote.payment_type ?? 'cash_sale')

  // Cascading dropdown logic
  function handlePropertyTypeChange(v: string) {
    setPropertyCategory(v)
    setTypeOfClean('')
    setServiceType('')
  }

  function handleCleanTypeChange(v: string) {
    setTypeOfClean(v)
    setServiceType('')
  }

  // Build options — include existing value even if it's not in the predefined list
  function buildOptions(list: string[], current: string) {
    const opts = list.map((v) => ({ value: v, label: v }))
    if (current && !list.includes(current)) {
      opts.unshift({ value: current, label: current })
    }
    return opts
  }

  const cleanTypeList = propertyCategory ? (CLEAN_TYPES[propertyCategory] ?? []) : Object.values(CLEAN_TYPES).flat()
  const serviceTypeList = typeOfClean ? (SERVICE_TYPES[typeOfClean] ?? []) : []

  const propertyTypeOptions = buildOptions(PROPERTY_TYPES, propertyCategory)
  const cleanTypeOptions = buildOptions(cleanTypeList, typeOfClean)
  const serviceTypeOptions = buildOptions(serviceTypeList, serviceType)

  // Add-ons — seed from existing items
  const [addons, setAddons] = useState<Addon[]>(
    items
      .sort((a, b) => a.sort_order - b.sort_order)
      .map((it) => ({ key: it.id, label: it.label, price: String(it.price) })),
  )

  // Submit state
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  // Add-on management
  function addAddon() {
    setAddons((prev) => [...prev, { key: crypto.randomUUID(), label: '', price: '' }])
  }

  function updateAddon(key: string, field: 'label' | 'price', value: string) {
    setAddons((prev) => prev.map((a) => (a.key === key ? { ...a, [field]: value } : a)))
  }

  function removeAddon(key: string) {
    setAddons((prev) => prev.filter((a) => a.key !== key))
  }

  // Totals
  const base = toNum(basePrice)
  const disc = toNum(discount)
  const addonsTotal = addons.reduce((sum, a) => sum + toNum(a.price), 0)
  const total = base + addonsTotal - disc

  // Submit
  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSaved(false)

    if (!clientId) {
      setError('Please select a client.')
      return
    }

    startTransition(async () => {
      const result = await updateQuote({
        id: quote.id,
        client_id: clientId,
        status,
        date_issued: dateIssued || undefined,
        valid_until: validUntil || undefined,
        property_category: propertyCategory || undefined,
        type_of_clean: typeOfClean || undefined,
        service_type: serviceType || undefined,
        frequency: frequency || undefined,
        scope_size: scopeSize || undefined,
        service_address: serviceAddress.trim() || undefined,
        preferred_dates: preferredDates.trim() || undefined,
        scheduled_clean_date: scheduledCleanDate || undefined,
        notes: notes.trim() || undefined,
        base_price: base,
        discount: disc,
        gst_included: gstIncluded,
        payment_type: paymentType,
        addons: addons
          .filter((a) => a.label.trim())
          .map((a, i) => ({ label: a.label.trim(), price: toNum(a.price), sort_order: i })),
      })

      if (result?.error) {
        setError(result.error)
      } else {
        setSaved(true)
        setTimeout(() => setSaved(false), 3000)
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-2xl space-y-10">
      {/* ── Header info ─────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-sage-600">
        <span>Created {formatDate(quote.created_at)}</span>
        {quote.date_issued && <span>Issued {formatDate(quote.date_issued)}</span>}
      </div>

      {/* ── Section: Status ─────────────────────────── */}
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

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
          <Field
            label="Date issued"
            type="date"
            value={dateIssued}
            onChange={(next) => {
              setDateIssued(next)
              if (next && !validUntil) {
                const [y, m, d] = next.split('-').map(Number)
                const dt = new Date(Date.UTC(y, m - 1, d + 30))
                setValidUntil(dt.toISOString().slice(0, 10))
              }
            }}
          />
          <Field label="Valid until" type="date" value={validUntil} onChange={setValidUntil} />
        </div>
      </Section>

      {/* ── Section: Client ─────────────────────────── */}
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
        />
      </Section>

      {/* ── Section: Service details ────────────────── */}
      <Section title="Service Details">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Select
            label="Property type"
            value={propertyCategory}
            onChange={handlePropertyTypeChange}
            options={propertyTypeOptions}
          />
          <Select
            label="Type of clean"
            value={typeOfClean}
            onChange={handleCleanTypeChange}
            options={cleanTypeOptions}
            disabled={!propertyCategory}
            placeholder={propertyCategory ? 'Select…' : 'Select property type first'}
          />
          <Select
            label="Service type"
            value={serviceType}
            onChange={setServiceType}
            options={serviceTypeOptions}
            disabled={!typeOfClean}
            placeholder={typeOfClean ? 'Select…' : 'Select type of clean first'}
          />
          <Select
            label="Frequency"
            value={frequency}
            onChange={setFrequency}
            options={FREQUENCIES.map((v) => ({ value: v, label: v }))}
          />
        </div>
        <Select
          label="Scope / size"
          value={scopeSize}
          onChange={setScopeSize}
          options={SCOPE_SIZES.map((v) => ({ value: v, label: v }))}
          className="mt-4"
        />
        <AddressField label="Service address" value={serviceAddress} onChange={setServiceAddress} className="mt-4" />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
          <Field label="Preferred dates" value={preferredDates} onChange={setPreferredDates} />
          <Field label="Scheduled clean date" type="date" value={scheduledCleanDate} onChange={setScheduledCleanDate} />
        </div>
        <TextArea label="Notes" value={notes} onChange={setNotes} className="mt-4" />
      </Section>

      {/* ── Section: Pricing ────────────────────────── */}
      <Section title="Pricing">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Base price ($)" type="number" step="0.01" min="0" value={basePrice} onChange={setBasePrice} />
          <Field label="Discount ($)" type="number" step="0.01" min="0" value={discount} onChange={setDiscount} />
        </div>

        <label className="flex items-center gap-3 mt-4 cursor-pointer">
          <button
            type="button"
            role="switch"
            aria-checked={gstIncluded}
            onClick={() => setGstIncluded(!gstIncluded)}
            className={clsx(
              'relative inline-flex h-6 w-11 shrink-0 rounded-full transition-colors',
              gstIncluded ? 'bg-sage-500' : 'bg-gray-300',
            )}
          >
            <span
              className={clsx(
                'inline-block h-5 w-5 rounded-full bg-white shadow transform transition-transform mt-0.5',
                gstIncluded ? 'translate-x-[22px]' : 'translate-x-0.5',
              )}
            />
          </button>
          <span className="text-sm font-medium text-sage-800">GST included</span>
        </label>

        <div className="mt-4">
          <span className="block text-sm font-semibold text-sage-800 mb-1.5">Payment type</span>
          <div className="flex gap-3">
            <button type="button" onClick={() => setPaymentType('cash_sale')} className={clsx('px-4 py-2 rounded-lg text-sm font-medium transition-colors', paymentType === 'cash_sale' ? 'bg-sage-500 text-white' : 'bg-sage-100 text-sage-600 hover:bg-sage-200')}>Cash Sale</button>
            <button type="button" onClick={() => setPaymentType('on_account')} className={clsx('px-4 py-2 rounded-lg text-sm font-medium transition-colors', paymentType === 'on_account' ? 'bg-sage-500 text-white' : 'bg-sage-100 text-sage-600 hover:bg-sage-200')}>On Account</button>
          </div>
        </div>
      </Section>

      {/* ── Section: Add-ons ────────────────────────── */}
      <Section title="Add-ons">
        {addons.length > 0 && (
          <div className="space-y-3 mb-4">
            {addons.map((a) => (
              <div key={a.key} className="flex items-start gap-3">
                <div className="flex-1">
                  <input
                    type="text"
                    placeholder="Description"
                    value={a.label}
                    onChange={(e) => updateAddon(a.key, 'label', e.target.value)}
                    className="w-full rounded-lg border border-sage-200 px-4 py-3 text-sage-800 placeholder:text-sage-300 focus:outline-none focus:ring-2 focus:ring-sage-500 focus:border-transparent text-sm"
                  />
                </div>
                <div className="w-28">
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="$0.00"
                    value={a.price}
                    onChange={(e) => updateAddon(a.key, 'price', e.target.value)}
                    className="w-full rounded-lg border border-sage-200 px-4 py-3 text-sage-800 placeholder:text-sage-300 focus:outline-none focus:ring-2 focus:ring-sage-500 focus:border-transparent text-sm"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => removeAddon(a.key)}
                  className="mt-2.5 text-sage-400 hover:text-red-500 transition-colors"
                  aria-label="Remove add-on"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>
        )}

        <button
          type="button"
          onClick={addAddon}
          className="inline-flex items-center gap-2 text-sm font-medium text-sage-500 hover:text-sage-700 transition-colors"
        >
          <Plus size={16} />
          Add item
        </button>
      </Section>

      {/* ── Total ───────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-sage-100 p-5">
        <div className="flex items-center justify-between text-sm text-sage-600 mb-1">
          <span>Base price</span>
          <span>{formatNZD(base)}</span>
        </div>
        {addonsTotal > 0 && (
          <div className="flex items-center justify-between text-sm text-sage-600 mb-1">
            <span>Add-ons ({addons.filter((a) => a.label.trim()).length})</span>
            <span>{formatNZD(addonsTotal)}</span>
          </div>
        )}
        {disc > 0 && (
          <div className="flex items-center justify-between text-sm text-sage-600 mb-1">
            <span>Discount</span>
            <span>-{formatNZD(disc)}</span>
          </div>
        )}
        <div className="border-t border-sage-100 mt-3 pt-3 flex items-center justify-between">
          <span className="font-semibold text-sage-800">Total{gstIncluded ? ' (GST incl.)' : ' (excl. GST)'}</span>
          <span className="text-xl font-bold text-sage-800">{formatNZD(total)}</span>
        </div>
      </div>

      {/* ── Error / Success + Submit ────────────────── */}
      {error && (
        <p className="text-red-600 text-sm bg-red-50 rounded-lg px-4 py-3">{error}</p>
      )}
      {saved && (
        <p className="text-emerald-700 text-sm bg-emerald-50 rounded-lg px-4 py-3">Quote saved.</p>
      )}

      <div className="flex items-center gap-4">
        <button
          type="submit"
          disabled={isPending}
          className="bg-sage-500 text-white font-semibold px-6 py-3 rounded-lg hover:bg-sage-700 transition-colors disabled:opacity-50"
        >
          {isPending ? 'Saving…' : 'Save Changes'}
        </button>
        <a href="/portal/quotes" className="text-sm text-sage-600 hover:text-sage-800 transition-colors">
          Back to quotes
        </a>
      </div>
    </form>
  )
}

// ── Form primitives ───────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <fieldset>
      <legend className="text-lg font-semibold text-sage-800 mb-4">{title}</legend>
      {children}
    </fieldset>
  )
}

function Field({
  label,
  required,
  className,
  ...props
}: {
  label: string
  required?: boolean
  className?: string
  value: string
  onChange: (v: string) => void
  type?: string
  step?: string
  min?: string
  placeholder?: string
}) {
  const { value, onChange, ...rest } = props
  return (
    <label className={clsx('block', className)}>
      <span className="block text-sm font-semibold text-sage-800 mb-1.5">
        {label}
        {required && <span className="text-red-500 ml-0.5">*</span>}
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
  label,
  value,
  onChange,
  className,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  className?: string
}) {
  return (
    <label className={clsx('block', className)}>
      <span className="block text-sm font-semibold text-sage-800 mb-1.5">{label}</span>
      <textarea
        rows={3}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg border border-sage-200 px-4 py-3 text-sage-800 placeholder:text-sage-300 focus:outline-none focus:ring-2 focus:ring-sage-500 focus:border-transparent text-sm resize-y"
      />
    </label>
  )
}

function Select({
  label,
  value,
  onChange,
  options,
  placeholder = 'Select…',
  disabled,
  className,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  options: { value: string; label: string }[]
  placeholder?: string
  disabled?: boolean
  className?: string
}) {
  return (
    <label className={clsx('block', className)}>
      <span className="block text-sm font-semibold text-sage-800 mb-1.5">{label}</span>
      <div className="relative">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          className={clsx(
            'w-full appearance-none rounded-lg border border-sage-200 px-4 py-3 pr-10 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-sage-500 focus:border-transparent',
            disabled ? 'text-sage-400 bg-sage-50 cursor-not-allowed' : 'text-sage-800',
          )}
        >
          <option value="">{placeholder}</option>
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-sage-400 pointer-events-none" />
      </div>
    </label>
  )
}
