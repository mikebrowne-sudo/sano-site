'use client'

import { useState, useTransition } from 'react'
import { createQuote } from '../_actions'
import { Plus, Trash2, ChevronDown } from 'lucide-react'
import clsx from 'clsx'

// ── Option data ─────────────────────────────────────────────

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

// ── Types ───────────────────────────────────────────────────

interface Client {
  id: string
  name: string
  company_name: string | null
  email: string | null
  phone: string | null
  service_address: string | null
  billing_address: string | null
  billing_same_as_service: boolean
}

interface Addon {
  key: string
  label: string
  price: string
}

interface ValidationErrors {
  clientName?: string
  serviceAddress?: string
  basePrice?: string
}

// ── Helpers ─────────────────────────────────────────────────

function toNum(v: string) {
  const n = parseFloat(v)
  return Number.isFinite(n) ? n : 0
}

function formatNZD(dollars: number) {
  return new Intl.NumberFormat('en-NZ', { style: 'currency', currency: 'NZD' }).format(dollars)
}

// ── Component ───────────────────────────────────────────────

export function NewQuoteForm({ clients }: { clients: Client[] }) {
  // Client mode
  const [clientMode, setClientMode] = useState<'existing' | 'new'>(
    clients.length > 0 ? 'existing' : 'new',
  )
  const [clientId, setClientId] = useState('')

  // Contact fields (autofilled from client or entered manually)
  const [contactName, setContactName] = useState('')
  const [companyName, setCompanyName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [serviceAddress, setServiceAddress] = useState('')
  const [billingAddress, setBillingAddress] = useState('')
  const [billingSame, setBillingSame] = useState(true)

  // Service details
  const [propertyType, setPropertyType] = useState('')
  const [cleanType, setCleanType] = useState('')
  const [serviceType, setServiceType] = useState('')
  const [frequency, setFrequency] = useState('')
  const [scopeSize, setScopeSize] = useState('')
  const [preferredDates, setPreferredDates] = useState('')
  const [scheduledCleanDate, setScheduledCleanDate] = useState('')
  const [notes, setNotes] = useState('')

  // Pricing
  const [basePrice, setBasePrice] = useState('')
  const [discount, setDiscount] = useState('')
  const [gstIncluded, setGstIncluded] = useState(true)
  const [paymentType, setPaymentType] = useState('cash_sale')

  // Add-ons
  const [addons, setAddons] = useState<Addon[]>([])

  // State
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [validationErrors, setValidationErrors] = useState<ValidationErrors>({})

  // ── Client autofill ──────────────────────────────────────

  function handleClientSelect(id: string) {
    setClientId(id)
    const c = clients.find((cl) => cl.id === id)
    if (!c) return
    setContactName(c.name)
    setCompanyName(c.company_name ?? '')
    setPhone(c.phone ?? '')
    setEmail(c.email ?? '')
    setServiceAddress(c.service_address ?? '')
    setBillingAddress(c.billing_address ?? '')
    setBillingSame(c.billing_same_as_service)
  }

  function handleClientModeSwitch(mode: 'existing' | 'new') {
    setClientMode(mode)
    if (mode === 'new') {
      setClientId('')
      setContactName('')
      setCompanyName('')
      setPhone('')
      setEmail('')
      setServiceAddress('')
      setBillingAddress('')
      setBillingSame(true)
    }
  }

  // ── Cascading dropdowns ──────────────────────────────────

  function handlePropertyTypeChange(v: string) {
    setPropertyType(v)
    setCleanType('')
    setServiceType('')
  }

  function handleCleanTypeChange(v: string) {
    setCleanType(v)
    setServiceType('')
  }

  const cleanTypeOptions = propertyType ? (CLEAN_TYPES[propertyType] ?? []) : []
  const serviceTypeOptions = cleanType ? (SERVICE_TYPES[cleanType] ?? []) : []

  // ── Add-ons ──────────────────────────────────────────────

  function addAddon() {
    setAddons((prev) => [...prev, { key: crypto.randomUUID(), label: '', price: '' }])
  }
  function updateAddon(key: string, field: 'label' | 'price', value: string) {
    setAddons((prev) => prev.map((a) => (a.key === key ? { ...a, [field]: value } : a)))
  }
  function removeAddon(key: string) {
    setAddons((prev) => prev.filter((a) => a.key !== key))
  }

  // ── Totals ───────────────────────────────────────────────

  const base = toNum(basePrice)
  const disc = toNum(discount)
  const addonsTotal = addons.reduce((sum, a) => sum + toNum(a.price), 0)
  const total = base + addonsTotal - disc

  // ── Validation + submit ──────────────────────────────────

  function validate(): boolean {
    const errs: ValidationErrors = {}

    if (clientMode === 'new' && !contactName.trim()) {
      errs.clientName = 'Client name is required.'
    }
    if (clientMode === 'existing' && !clientId) {
      errs.clientName = 'Please select a client.'
    }
    if (!serviceAddress.trim()) {
      errs.serviceAddress = 'Service address is required.'
    }
    if (!basePrice.trim() || toNum(basePrice) <= 0) {
      errs.basePrice = 'Base price is required.'
    }

    setValidationErrors(errs)
    return Object.keys(errs).length === 0
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (!validate()) return

    startTransition(async () => {
      const result = await createQuote({
        client_id: clientMode === 'existing' ? clientId : undefined,
        new_client:
          clientMode === 'new'
            ? {
                name: contactName.trim(),
                company_name: companyName.trim() || undefined,
                email: email.trim() || undefined,
                phone: phone.trim() || undefined,
                service_address: serviceAddress.trim() || undefined,
                billing_address: billingSame ? undefined : (billingAddress.trim() || undefined),
                billing_same_as_service: billingSame,
              }
            : undefined,
        property_category: propertyType || undefined,
        type_of_clean: cleanType || undefined,
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
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-2xl space-y-10">

      {/* ── Section 1: Client ───────────────────────── */}
      <Section title="Client">
        {clients.length > 0 && (
          <div className="flex gap-3 mb-5">
            <TabButton active={clientMode === 'existing'} onClick={() => handleClientModeSwitch('existing')}>
              Existing client
            </TabButton>
            <TabButton active={clientMode === 'new'} onClick={() => handleClientModeSwitch('new')}>
              New client
            </TabButton>
          </div>
        )}

        {clientMode === 'existing' ? (
          <>
            <Select
              label="Client"
              value={clientId}
              onChange={handleClientSelect}
              options={clients.map((c) => ({
                value: c.id,
                label: c.company_name ? `${c.name} — ${c.company_name}` : c.name,
              }))}
              placeholder="Choose a client…"
              error={validationErrors.clientName}
            />
            {clientId && (
              <div className="mt-4 space-y-4 bg-sage-50 rounded-lg p-4">
                <p className="text-xs font-medium text-sage-500 uppercase tracking-wide">Client details — edit if needed for this quote</p>
                <Field label="Contact person" value={contactName} onChange={setContactName} />
                <Field label="Company name" value={companyName} onChange={setCompanyName} />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Field label="Phone" type="tel" value={phone} onChange={setPhone} />
                  <Field label="Email" type="email" value={email} onChange={setEmail} />
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="space-y-4">
            <Field label="Contact person" required value={contactName} onChange={setContactName} error={validationErrors.clientName} />
            <Field label="Company name" value={companyName} onChange={setCompanyName} />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Phone" type="tel" value={phone} onChange={setPhone} />
              <Field label="Email" type="email" value={email} onChange={setEmail} />
            </div>
          </div>
        )}
      </Section>

      {/* ── Section 2: Address ──────────────────────── */}
      <Section title="Address">
        <Field
          label="Service address"
          required
          value={serviceAddress}
          onChange={setServiceAddress}
          placeholder="Full street address"
          error={validationErrors.serviceAddress}
        />

        <label className="flex items-center gap-3 mt-4 cursor-pointer">
          <Toggle checked={billingSame} onChange={setBillingSame} />
          <span className="text-sm font-medium text-sage-800">Billing same as service</span>
        </label>

        {!billingSame && (
          <Field label="Billing address" value={billingAddress} onChange={setBillingAddress} className="mt-4" />
        )}
      </Section>

      {/* ── Section 3: Service ──────────────────────── */}
      <Section title="Service">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Select
            label="Property type"
            value={propertyType}
            onChange={handlePropertyTypeChange}
            options={PROPERTY_TYPES.map((v) => ({ value: v, label: v }))}
          />
          <Select
            label="Type of clean"
            value={cleanType}
            onChange={handleCleanTypeChange}
            options={cleanTypeOptions.map((v) => ({ value: v, label: v }))}
            disabled={!propertyType}
            placeholder={propertyType ? 'Select…' : 'Select property type first'}
          />
          <Select
            label="Service type"
            value={serviceType}
            onChange={setServiceType}
            options={serviceTypeOptions.map((v) => ({ value: v, label: v }))}
            disabled={!cleanType}
            placeholder={cleanType ? 'Select…' : 'Select type of clean first'}
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
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
          <Field label="Preferred dates" value={preferredDates} onChange={setPreferredDates} placeholder="e.g. Mondays, or 21 April" />
          <Field label="Scheduled clean date" type="date" value={scheduledCleanDate} onChange={setScheduledCleanDate} />
        </div>
      </Section>

      {/* ── Section 4: Pricing ──────────────────────── */}
      <Section title="Pricing">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field
            label="Base price ($)"
            type="number"
            step="0.01"
            min="0"
            value={basePrice}
            onChange={setBasePrice}
            required
            error={validationErrors.basePrice}
          />
          <Field label="Discount ($)" type="number" step="0.01" min="0" value={discount} onChange={setDiscount} />
        </div>

        <label className="flex items-center gap-3 mt-4 cursor-pointer">
          <Toggle checked={gstIncluded} onChange={setGstIncluded} />
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

      {/* ── Section 5: Add-ons ──────────────────────── */}
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

      {/* ── Section 6: Notes ────────────────────────── */}
      <Section title="Notes">
        <textarea
          rows={3}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Anything else relevant to this quote…"
          className="w-full rounded-lg border border-sage-200 px-4 py-3 text-sage-800 placeholder:text-sage-300 focus:outline-none focus:ring-2 focus:ring-sage-500 focus:border-transparent text-sm resize-y"
        />
      </Section>

      {/* ── Running total ───────────────────────────── */}
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

      {/* ── Error + Submit ──────────────────────────── */}
      {error && (
        <p className="text-red-600 text-sm bg-red-50 rounded-lg px-4 py-3">{error}</p>
      )}

      <div className="flex items-center gap-4">
        <button
          type="submit"
          disabled={isPending}
          className="bg-sage-500 text-white font-semibold px-6 py-3 rounded-lg hover:bg-sage-700 transition-colors disabled:opacity-50"
        >
          {isPending ? 'Saving…' : 'Save Quote'}
        </button>
        <a href="/portal/quotes" className="text-sm text-sage-600 hover:text-sage-800 transition-colors">
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
  label,
  required,
  className,
  error,
  value,
  onChange,
  ...rest
}: {
  label: string
  required?: boolean
  className?: string
  error?: string
  value: string
  onChange: (v: string) => void
  type?: string
  step?: string
  min?: string
  placeholder?: string
}) {
  return (
    <label className={clsx('block', className)}>
      <span className="block text-sm font-semibold text-sage-800 mb-1.5">
        {label}
        {required && <span className="text-red-500 ml-0.5">*</span>}
      </span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={clsx(
          'w-full rounded-lg border px-4 py-3 text-sage-800 placeholder:text-sage-300 focus:outline-none focus:ring-2 focus:ring-sage-500 focus:border-transparent text-sm',
          error ? 'border-red-300' : 'border-sage-200',
        )}
        {...rest}
      />
      {error && <span className="text-red-500 text-xs mt-1 block">{error}</span>}
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
  error,
  className,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  options: { value: string; label: string }[]
  placeholder?: string
  disabled?: boolean
  error?: string
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
            'w-full appearance-none rounded-lg border px-4 py-3 pr-10 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-sage-500 focus:border-transparent',
            disabled ? 'text-sage-400 bg-sage-50 cursor-not-allowed' : 'text-sage-800',
            error ? 'border-red-300' : 'border-sage-200',
          )}
        >
          <option value="">{placeholder}</option>
          {options.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
        <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-sage-400 pointer-events-none" />
      </div>
      {error && <span className="text-red-500 text-xs mt-1 block">{error}</span>}
    </label>
  )
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={clsx(
        'relative inline-flex h-6 w-11 shrink-0 rounded-full transition-colors',
        checked ? 'bg-sage-500' : 'bg-gray-300',
      )}
    >
      <span
        className={clsx(
          'inline-block h-5 w-5 rounded-full bg-white shadow transform transition-transform mt-0.5',
          checked ? 'translate-x-[22px]' : 'translate-x-0.5',
        )}
      />
    </button>
  )
}

function TabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={clsx(
        'px-4 py-2 rounded-lg text-sm font-medium transition-colors',
        active ? 'bg-sage-500 text-white' : 'bg-sage-100 text-sage-600 hover:bg-sage-200',
      )}
    >
      {children}
    </button>
  )
}
