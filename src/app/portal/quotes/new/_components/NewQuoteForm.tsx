'use client'

import { useEffect, useMemo, useState, useTransition } from 'react'
import { createQuote } from '../_actions'
import { AddressField } from '../../../_components/AddressField'
import { QuoteBuilder, emptyBuilderState, type QuoteBuilderState } from '../../_components/QuoteBuilder'
import { PricingSummary, emptyPricingSummaryValue, type PricingSummaryValue } from '../../_components/PricingSummary'
import { OverridePanel, type OverridePanelValue } from '../../_components/OverridePanel'
import { validateOverride, type OverrideValidationErrors } from '../../_components/override-validation'
import { computeFinalPrice } from './final-price'
import { SERVICE_TYPES_BY_CATEGORY } from '@/lib/quote-wording'
import { calculateQuotePrice, isPricingEligible } from '@/lib/quote-pricing'
import {
  buildCommercialDescription,
  buildQuoteItemsFromCalc,
  mapPricingMode,
  type CommercialCalculationRow,
} from '@/lib/commercialPricingMapping'
import {
  CommercialDetailsSection,
  emptyCommercialDetails,
  toCommercialDetailsInput,
  type CommercialDetailsFormState,
} from '../../_components/commercial/CommercialDetailsSection'
import {
  CommercialScopeBuilder,
  toScopeItemsInput,
  type CommercialScopeFormRow,
} from '../../_components/commercial/CommercialScopeBuilder'
import { Plus, Trash2, ChevronDown } from 'lucide-react'
import clsx from 'clsx'


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

export function NewQuoteForm({
  clients,
  calc,
}: {
  clients: Client[]
  calc?: CommercialCalculationRow | null
}) {
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

  // Service details — structured builder
  const [builder, setBuilder] = useState<QuoteBuilderState>(emptyBuilderState())

  // Pricing engine state (owned by form; consumed by <PricingSummary>)
  const [pricing, setPricing] = useState<PricingSummaryValue>(emptyPricingSummaryValue())

  // Override state
  const [override, setOverride] = useState<OverridePanelValue>({
    is_price_overridden: false,
    override_price: '',
    override_reason: '',
    override_confirmed: false,
  })
  const [overrideErrors, setOverrideErrors] = useState<OverrideValidationErrors>({})

  // Scheduling
  const [preferredDates, setPreferredDates] = useState('')
  const [scheduledCleanDate, setScheduledCleanDate] = useState('')

  // Supplementary notes (client-facing)
  const [notes, setNotes] = useState('')

  // Pricing
  const [basePrice, setBasePrice] = useState('')
  const [discount, setDiscount] = useState('')
  const [gstIncluded, setGstIncluded] = useState(true)
  const [paymentType, setPaymentType] = useState('cash_sale')

  // Add-ons
  const [addons, setAddons] = useState<Addon[]>([])

  // Commercial quote engine state — only used when service_category === 'commercial'.
  const [commercialDetails, setCommercialDetails] = useState<CommercialDetailsFormState>(emptyCommercialDetails)
  const [commercialScope, setCommercialScope] = useState<CommercialScopeFormRow[]>([])
  const isCommercial = builder.service_category === 'commercial'

  // ── Pricing engine (derived) ─────────────────────────────
  const eligible = isPricingEligible(builder.service_category || null, builder.service_type_code || null)
  const serviceSelected = !!builder.service_category && !!builder.service_type_code

  const engineResult = useMemo(() => {
    if (!eligible) return null
    return calculateQuotePrice(
      {
        service_category: builder.service_category || null,
        service_type_code: builder.service_type_code || null,
        bedrooms: builder.bedrooms ? parseInt(builder.bedrooms, 10) : null,
        bathrooms: builder.bathrooms ? parseInt(builder.bathrooms, 10) : null,
        condition_tags: builder.condition_tags,
        addons_wording: builder.addons_wording,
        frequency: builder.frequency || null,
        x_per_week: builder.x_per_week ? parseInt(builder.x_per_week, 10) : null,
      },
      pricing.pricing_mode,
    )
    /* eslint-disable react-hooks/exhaustive-deps */
  }, [
    eligible,
    builder.service_category,
    builder.service_type_code,
    builder.bedrooms,
    builder.bathrooms,
    builder.condition_tags.join(','),
    builder.addons_wording.join(','),
    builder.frequency,
    builder.x_per_week,
    pricing.pricing_mode,
  ])
  /* eslint-enable react-hooks/exhaustive-deps */

  // For ineligible services, lock override on and pre-fill price
  useEffect(() => {
    if (serviceSelected && !eligible && !override.is_price_overridden) {
      setOverride((prev) => ({
        ...prev,
        is_price_overridden: true,
        override_price: prev.override_price || (engineResult?.calculated_price != null
          ? String(engineResult.calculated_price)
          : ''),
      }))
    }
  }, [serviceSelected, eligible, override.is_price_overridden, engineResult?.calculated_price])

  const finalPrice = computeFinalPrice({
    is_price_overridden: override.is_price_overridden,
    override_price: override.override_price,
    engineFinalPrice: engineResult?.final_price ?? null,
    manualBasePrice: parseFloat(basePrice) || 0,
  })

  // State
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [validationErrors, setValidationErrors] = useState<ValidationErrors>({})

  // One-shot seed from a commercial calc (read-and-map only; no recalc).
  // Runs once on mount when `calc` is present.
  const [calcSeeded, setCalcSeeded] = useState(false)
  useEffect(() => {
    if (calc && !calcSeeded) {
      const view = calc.selected_pricing_view ?? 'per_clean'
      const corePrice = view === 'monthly' ? calc.monthly_value : calc.total_per_clean

      setBuilder((prev) => ({
        ...prev,
        service_category: 'commercial',
        service_type_code: 'maintenance',
        description_edited: true,
        generated_scope: buildCommercialDescription(calc.inputs),
      }))
      setPricing((prev) => ({ ...prev, pricing_mode: mapPricingMode(calc.pricing_mode) }))
      setBasePrice(String(corePrice))
      setAddons(
        buildQuoteItemsFromCalc(calc).map((item, i) => ({
          key: `calc-${i}`,
          label: item.label,
          price: String(item.price),
        })),
      )
      // Prevent the ineligible-service auto-override effect from clobbering the
      // calc price to 0. The calc itself is the authoritative override.
      setOverride((prev) => ({
        ...prev,
        is_price_overridden: true,
        override_price: String(corePrice),
        override_reason: 'From commercial calculator',
        override_confirmed: true,
      }))
      setCalcSeeded(true)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

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

  const base = finalPrice
  const disc = override.is_price_overridden ? 0 : toNum(discount)
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
    if (eligible) {
      if (engineResult?.final_price == null || engineResult.final_price <= 0) {
        errs.basePrice = 'Final price is required. Select a service type and confirm pricing.'
      }
    } else if (!basePrice.trim() || toNum(basePrice) <= 0) {
      errs.basePrice = 'Base price is required.'
    }

    setValidationErrors(errs)
    return Object.keys(errs).length === 0
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (!validate()) return

    const overrideValidation = validateOverride(override)
    if (Object.keys(overrideValidation).length > 0) {
      setOverrideErrors(overrideValidation)
      return  // prevent submit
    }
    setOverrideErrors({})

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
        // Legacy-compat column (human-readable label for pricing label renderer)
        type_of_clean: (() => {
          if (!builder.service_category || !builder.service_type_code) return undefined
          return SERVICE_TYPES_BY_CATEGORY[builder.service_category].find((t) => t.value === builder.service_type_code)?.label
        })(),
        // Structured builder fields
        service_category: builder.service_category || undefined,
        service_type_code: builder.service_type_code || undefined,
        property_type: builder.property_type || undefined,
        bedrooms: builder.bedrooms ? parseInt(builder.bedrooms, 10) : undefined,
        bathrooms: builder.bathrooms ? parseInt(builder.bathrooms, 10) : undefined,
        site_type: builder.site_type.trim() || undefined,
        frequency: builder.frequency || undefined,
        areas_included: builder.areas_included,
        condition_tags: builder.condition_tags,
        addons_wording: builder.addons_wording,
        generated_scope: builder.generated_scope || undefined,
        description_edited: builder.description_edited,
        service_address: serviceAddress.trim() || undefined,
        preferred_dates: preferredDates.trim() || undefined,
        scheduled_clean_date: scheduledCleanDate || undefined,
        notes: notes.trim() || undefined,
        base_price: finalPrice,
        calculated_price: calc
          ? (calc.selected_pricing_view === 'monthly' ? calc.monthly_value : calc.total_per_clean)
          : (engineResult?.calculated_price ?? null),
        is_price_overridden: override.is_price_overridden,
        override_price: override.is_price_overridden ? parseFloat(override.override_price) : null,
        override_reason: override.is_price_overridden ? override.override_reason.trim() : null,
        override_confirmed: override.override_confirmed,
        pricing_mode: eligible ? pricing.pricing_mode : undefined,
        estimated_hours: calc?.estimated_hours ?? engineResult?.estimated_hours ?? undefined,
        pricing_breakdown: eligible ? engineResult?.breakdown ?? undefined : undefined,
        commercial_calc_id: calc?.id ?? null,
        commercial_details: isCommercial
          ? toCommercialDetailsInput(commercialDetails) ?? undefined
          : undefined,
        commercial_scope: isCommercial ? toScopeItemsInput(commercialScope) : undefined,
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
        <AddressField
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
          <AddressField label="Billing address" value={billingAddress} onChange={setBillingAddress} className="mt-4" />
        )}
      </Section>

      {/* ── Section 3: Service ──────────────────────── */}
      <Section title="Service">
        <QuoteBuilder value={builder} onChange={setBuilder} />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6">
          <Field label="Preferred dates" value={preferredDates} onChange={setPreferredDates} placeholder="e.g. Mondays, or 21 April" />
          <Field label="Scheduled clean date" type="date" value={scheduledCleanDate} onChange={setScheduledCleanDate} />
        </div>
      </Section>

      {/* ── Section 3b: Commercial details + scope (commercial only) ── */}
      {isCommercial && (
        <Section title="Commercial details">
          <div className="space-y-4">
            <CommercialDetailsSection
              value={commercialDetails}
              onChange={setCommercialDetails}
            />
            <CommercialScopeBuilder
              rows={commercialScope}
              onChange={setCommercialScope}
            />
          </div>
        </Section>
      )}

      {/* ── Section 4: Pricing ──────────────────────── */}
      <Section title="Pricing">
        {/* Final-price banner — always visible */}
        <div className="mb-4 bg-white rounded-xl border border-sage-100 p-4 flex items-center justify-between">
          <div>
            <span className="block text-xs font-medium text-sage-500 uppercase tracking-wide">Final price</span>
            {override.is_price_overridden && (
              <span className="text-[11px] text-amber-700 font-medium">Manual override applied</span>
            )}
          </div>
          <span className="text-2xl font-bold text-sage-800">
            {new Intl.NumberFormat('en-NZ', { style: 'currency', currency: 'NZD' }).format(finalPrice)}
          </span>
        </div>

        {eligible ? (
          <PricingSummary
            builder={builder}
            value={pricing}
            onChange={setPricing}
            readOnly={override.is_price_overridden}
          />
        ) : (
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
        )}

        <div className="mt-4 max-w-sm">
          <Field
            label="Discount ($)"
            type="number"
            step="0.01"
            min="0"
            value={discount}
            onChange={setDiscount}
            disabled={override.is_price_overridden}
          />
          {override.is_price_overridden && (
            <p className="mt-1 text-xs text-sage-500 italic">Discount doesn&apos;t apply to overridden prices.</p>
          )}
        </div>

        <OverridePanel
          value={override}
          onChange={(next) => {
            // For ineligible services, force is_price_overridden to stay true
            if (serviceSelected && !eligible) next.is_price_overridden = true
            // Pre-fill custom price when toggling override on and input is empty
            if (next.is_price_overridden && !override.is_price_overridden && !next.override_price) {
              next.override_price = engineResult?.calculated_price != null
                ? String(engineResult.calculated_price)
                : ''
            }
            setOverride(next)
          }}
          errors={overrideErrors}
        />

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
  disabled,
  ...rest
}: {
  label: string
  required?: boolean
  className?: string
  error?: string
  value: string
  onChange: (v: string) => void
  disabled?: boolean
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
        disabled={disabled}
        className={clsx(
          'w-full rounded-lg border px-4 py-3 text-sage-800 placeholder:text-sage-300 focus:outline-none focus:ring-2 focus:ring-sage-500 focus:border-transparent text-sm',
          error ? 'border-red-300' : 'border-sage-200',
          disabled && 'opacity-60 cursor-not-allowed bg-sage-50',
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
