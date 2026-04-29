'use client'

// Phase 5.5.11 — New Client modal.
//
// Six tight sections — should take 60–90s to fill in. Live duplicate
// detection runs on email/phone/name as the user types (debounced).
// On save, a single server action creates the client + primary
// contact + optional accounts contact + optional first site.
//
// Two render modes:
//  · `inline=true`  — renders the form in-place (used by the
//                     standalone /portal/clients/new page).
//  · `inline=false` — renders inside a modal overlay (used by the
//                     new-quote flow's Create-new-client button).
//
// `onCreated` is invoked with the new client id after a successful
// save; the standalone page redirects, the modal caller closes the
// overlay and pre-selects the new client.

import { useEffect, useMemo, useRef, useState, useTransition } from 'react'
import { X, Search, AlertCircle } from 'lucide-react'
import {
  createClientWithSetup,
  findClientMatches,
  type ClientType,
  type BusinessType,
  type PaymentType,
  type PaymentTerms,
  type LeadSource,
  type PossibleMatch,
  type NewClientInput,
} from '../_actions-setup'

interface Props {
  inline?: boolean
  onCancel?: () => void
  onCreated?: (id: string) => void
}

const BUSINESS_TYPE_OPTIONS: { value: BusinessType; label: string }[] = [
  { value: 'property_management',  label: 'Property management' },
  { value: 'construction',         label: 'Construction / building' },
  { value: 'office_commercial',    label: 'Office / commercial' },
  { value: 'retail_hospitality',   label: 'Retail / hospitality' },
  { value: 'body_corporate',       label: 'Body corporate / facilities' },
  { value: 'airbnb',               label: 'Airbnb / short-stay host' },
  { value: 'other',                label: 'Other' },
]

const LEAD_SOURCE_OPTIONS: { value: LeadSource; label: string }[] = [
  { value: 'google',          label: 'Google' },
  { value: 'referral',        label: 'Referral' },
  { value: 'existing_client', label: 'Existing client' },
  { value: 'social',          label: 'Social' },
  { value: 'other',           label: 'Other' },
]

// Smart defaults based on client_type + business_type.
// Individual → prepaid. Company → on_account 14 days. Property
// management → on_account 20th of month.
function defaultPayment(clientType: ClientType, biz: BusinessType | null): { type: PaymentType; terms: PaymentTerms | null } {
  if (clientType === 'individual') return { type: 'prepaid', terms: null }
  if (biz === 'property_management') return { type: 'on_account', terms: '20_of_month' }
  return { type: 'on_account', terms: '14_days' }
}

export function NewClientModal({ inline = false, onCancel, onCreated }: Props) {
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const [clientType,    setClientType]    = useState<ClientType>('individual')
  const [name,          setName]          = useState('')
  const [businessType,  setBusinessType]  = useState<BusinessType | null>(null)

  const [primaryName,   setPrimaryName]   = useState('')
  const [primaryEmail,  setPrimaryEmail]  = useState('')
  const [primaryPhone,  setPrimaryPhone]  = useState('')

  const [accountsSame,  setAccountsSame]  = useState(true)
  const [accountsName,  setAccountsName]  = useState('')
  const [accountsEmail, setAccountsEmail] = useState('')

  // Auto-default payment fields based on client_type / business_type
  // until the operator manually changes them. `paymentTouched` flips
  // to true on any manual edit, after which auto-defaults stop
  // overwriting their input.
  const [paymentType,   setPaymentType]   = useState<PaymentType>('prepaid')
  const [paymentTerms,  setPaymentTerms]  = useState<PaymentTerms | null>(null)
  const [paymentTouched, setPaymentTouched] = useState(false)
  useEffect(() => {
    if (paymentTouched) return
    const d = defaultPayment(clientType, businessType)
    setPaymentType(d.type)
    setPaymentTerms(d.terms)
  }, [clientType, businessType, paymentTouched])

  const [leadSource,    setLeadSource]    = useState<LeadSource | null>(null)
  const [referredBy,    setReferredBy]    = useState('')

  const [serviceAddress, setServiceAddress] = useState('')
  const [notes,         setNotes]         = useState('')

  // ── Duplicate detection (debounced) ────────────────────────────────
  const [matches, setMatches] = useState<PossibleMatch[]>([])
  const [overrideDup, setOverrideDup] = useState(false)
  const lookupTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(() => {
    if (lookupTimer.current) clearTimeout(lookupTimer.current)
    lookupTimer.current = setTimeout(async () => {
      try {
        const out = await findClientMatches({
          email: primaryEmail.trim() || undefined,
          phone: primaryPhone.trim() || undefined,
          name: name.trim() || undefined,
        })
        setMatches(out)
      } catch {
        setMatches([])
      }
    }, 350)
    return () => {
      if (lookupTimer.current) clearTimeout(lookupTimer.current)
    }
  }, [primaryEmail, primaryPhone, name])

  const dupBlocking = matches.length > 0 && !overrideDup

  function reset() {
    setError(null); setName(''); setBusinessType(null); setClientType('individual')
    setPrimaryName(''); setPrimaryEmail(''); setPrimaryPhone('')
    setAccountsSame(true); setAccountsName(''); setAccountsEmail('')
    setPaymentType('prepaid'); setPaymentTerms(null); setPaymentTouched(false)
    setLeadSource(null); setReferredBy('')
    setServiceAddress(''); setNotes('')
    setMatches([]); setOverrideDup(false)
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (!name.trim()) { setError('Client name is required.'); return }
    if (!primaryName.trim() && !name.trim()) { setError('Primary contact name is required.'); return }
    if (paymentType === 'on_account' && !paymentTerms) { setError('Pick a payment term for on-account clients.'); return }
    if (dupBlocking) { setError('A possible existing client matches. Use existing or confirm Create anyway.'); return }

    const payload: NewClientInput = {
      client_type:                clientType,
      name:                       name.trim(),
      business_type:              businessType,
      primary_name:               (primaryName.trim() || name.trim()),
      primary_email:              primaryEmail.trim() || null,
      primary_phone:              primaryPhone.trim() || null,
      accounts_same_as_primary:   accountsSame,
      accounts_name:              accountsSame ? null : (accountsName.trim() || null),
      accounts_email:             accountsSame ? null : (accountsEmail.trim() || null),
      payment_type:               paymentType,
      payment_terms:              paymentType === 'on_account' ? paymentTerms : null,
      lead_source:                leadSource,
      referred_by:                leadSource === 'referral' ? (referredBy.trim() || null) : null,
      service_address:            serviceAddress.trim() || null,
      notes:                      notes.trim() || null,
    }

    startTransition(async () => {
      const res = await createClientWithSetup(payload)
      if ('error' in res) { setError(res.error); return }
      onCreated?.(res.client.id)
    })
  }

  const body = (
    <form onSubmit={onSubmit} className="space-y-7">
      {/* Section 1 — Client */}
      <Section title="Client" step={1}>
        <ToggleGroup
          ariaLabel="Client type"
          options={[
            { value: 'individual', label: 'Individual' },
            { value: 'company',    label: 'Company' },
          ]}
          value={clientType}
          onChange={(v) => setClientType(v as ClientType)}
        />
        <Field
          label={clientType === 'company' ? 'Company name' : 'Name'}
          required
          value={name}
          onChange={setName}
          placeholder={clientType === 'company' ? 'Acme Property Group' : 'Jane Smith'}
        />
        <SelectField
          label="Business type (optional)"
          value={businessType ?? ''}
          onChange={(v) => setBusinessType((v || null) as BusinessType | null)}
          options={[{ value: '', label: '— Not specified —' }, ...BUSINESS_TYPE_OPTIONS]}
        />
      </Section>

      {/* Section 2 — Primary contact */}
      <Section title="Primary contact" step={2}>
        <Field
          label="Contact name"
          value={primaryName}
          onChange={setPrimaryName}
          placeholder={clientType === 'company' ? 'Sarah Jones' : '(defaults to client name)'}
        />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Email" type="email" value={primaryEmail} onChange={setPrimaryEmail} />
          <Field label="Phone" type="tel" value={primaryPhone} onChange={setPrimaryPhone} />
        </div>
      </Section>

      {/* Section 3 — Accounts contact */}
      <Section title="Accounts contact" step={3}>
        <label className="flex items-center gap-2.5 text-sm text-sage-700 select-none cursor-pointer">
          <input type="checkbox" checked={accountsSame} onChange={(e) => setAccountsSame(e.target.checked)} className="accent-sage-500 w-4 h-4" />
          Same as primary contact
        </label>
        {!accountsSame && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Accounts name" value={accountsName} onChange={setAccountsName} />
            <Field label="Accounts email" type="email" value={accountsEmail} onChange={setAccountsEmail} />
          </div>
        )}
      </Section>

      {/* Section 4 — Payment setup */}
      <Section title="How does this client pay?" step={4}>
        <RadioGroup
          name="payment_type"
          value={paymentType}
          onChange={(v) => { setPaymentType(v as PaymentType); setPaymentTouched(true) }}
          options={[
            { value: 'prepaid',    label: 'Prepaid',    hint: 'Payment is required to confirm the booking.' },
            { value: 'on_account', label: 'On account', hint: 'Invoice is issued after the service.' },
          ]}
        />
        {paymentType === 'on_account' && (
          <div className="pl-5 pt-1">
            <SelectField
              label="Payment terms"
              value={paymentTerms ?? ''}
              onChange={(v) => { setPaymentTerms((v || null) as PaymentTerms | null); setPaymentTouched(true) }}
              options={[
                { value: '',            label: '— Pick one —' },
                { value: '7_days',      label: '7 days from invoice' },
                { value: '14_days',     label: '14 days from invoice' },
                { value: '20_of_month', label: '20th of the month' },
                { value: 'custom',      label: 'Custom (note in notes)' },
              ]}
            />
          </div>
        )}
      </Section>

      {/* Section 5 — Lead source */}
      <Section title="Lead source (optional)" step={5}>
        <SelectField
          label=""
          value={leadSource ?? ''}
          onChange={(v) => setLeadSource((v || null) as LeadSource | null)}
          options={[{ value: '', label: '— Not specified —' }, ...LEAD_SOURCE_OPTIONS]}
        />
        {leadSource === 'referral' && (
          <Field label="Referred by" value={referredBy} onChange={setReferredBy} placeholder="Name of referrer" />
        )}
      </Section>

      {/* Section 6 — Notes */}
      <Section title="Notes (optional)" step={6}>
        <Field
          label=""
          value={serviceAddress}
          onChange={setServiceAddress}
          placeholder="Service address (creates a default site if filled)"
        />
        <textarea
          rows={3}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Any extra context — billing quirks, preferred days, gate codes, etc."
          className="w-full rounded-lg border border-sage-200 px-4 py-3 text-sage-800 placeholder:text-sage-300 focus:outline-none focus:ring-2 focus:ring-sage-500 focus:border-transparent text-sm resize-y"
        />
      </Section>

      {/* Duplicate panel */}
      {matches.length > 0 && (
        <DuplicatesPanel
          matches={matches}
          override={overrideDup}
          onOverride={setOverrideDup}
          onUseExisting={(id) => { onCreated?.(id) }}
        />
      )}

      {error && (
        <p className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">{error}</p>
      )}

      <div className="flex items-center justify-end gap-2">
        {onCancel && (
          <button type="button" onClick={() => { reset(); onCancel?.() }} disabled={pending}
            className="px-4 py-2.5 rounded-lg text-sm text-sage-700 hover:bg-gray-100 disabled:opacity-50 min-h-[44px]">
            Cancel
          </button>
        )}
        <button type="submit" disabled={pending || dupBlocking}
          className="bg-sage-500 text-white font-semibold px-5 py-2.5 rounded-lg text-sm hover:bg-sage-700 transition-colors disabled:opacity-50 min-h-[44px]">
          {pending ? 'Creating…' : 'Create client'}
        </button>
      </div>
    </form>
  )

  if (inline) return <div className="max-w-2xl">{body}</div>

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-start justify-center p-4 overflow-y-auto" onClick={() => !pending && onCancel?.()}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl my-8 p-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-1">
          <h2 className="text-xl font-bold text-sage-800">New client</h2>
          <button type="button" onClick={() => onCancel?.()} aria-label="Close" className="text-sage-400 hover:text-sage-700"><X size={20} /></button>
        </div>
        <p className="text-xs text-sage-500 mb-5">Captures the client, primary contact, accounts contact, and payment setup in one go. Should take a minute.</p>
        {body}
      </div>
    </div>
  )
}

// ── Form primitives ───────────────────────────────────────────────

function Section({ step, title, children }: { step: number; title: string; children: React.ReactNode }) {
  return (
    <fieldset className="space-y-3">
      <legend className="flex items-center gap-2 text-sm font-semibold text-sage-800">
        <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-sage-100 text-sage-700 text-[11px]">{step}</span>
        {title}
      </legend>
      {children}
    </fieldset>
  )
}

function Field({
  label, required, value, onChange, type = 'text', placeholder,
}: {
  label: string
  required?: boolean
  value: string
  onChange: (v: string) => void
  type?: string
  placeholder?: string
}) {
  return (
    <label className="block">
      {label && (
        <span className="block text-xs font-semibold text-sage-700 uppercase tracking-wide mb-1.5">
          {label}{required && <span className="text-red-500 ml-0.5">*</span>}
        </span>
      )}
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        placeholder={placeholder}
        className="w-full rounded-lg border border-sage-200 px-4 py-2.5 text-sm text-sage-800 placeholder:text-sage-300 focus:outline-none focus:ring-2 focus:ring-sage-500 focus:border-transparent"
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
  options: { value: string; label: string }[]
}) {
  return (
    <label className="block">
      {label && (
        <span className="block text-xs font-semibold text-sage-700 uppercase tracking-wide mb-1.5">{label}</span>
      )}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg border border-sage-200 px-3 py-2.5 text-sm text-sage-800 bg-white focus:outline-none focus:ring-2 focus:ring-sage-500"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </label>
  )
}

function ToggleGroup({
  ariaLabel, options, value, onChange,
}: {
  ariaLabel: string
  options: { value: string; label: string }[]
  value: string
  onChange: (v: string) => void
}) {
  return (
    <div role="radiogroup" aria-label={ariaLabel} className="inline-flex border border-sage-200 rounded-lg p-0.5 bg-sage-50">
      {options.map((o) => {
        const active = value === o.value
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(o.value)}
            className={
              'px-4 py-1.5 rounded text-sm font-medium transition-colors ' +
              (active ? 'bg-white text-sage-800 shadow-sm' : 'text-sage-600 hover:text-sage-800')
            }
          >
            {o.label}
          </button>
        )
      })}
    </div>
  )
}

function RadioGroup({
  name, value, onChange, options,
}: {
  name: string
  value: string
  onChange: (v: string) => void
  options: { value: string; label: string; hint?: string }[]
}) {
  return (
    <div className="space-y-2">
      {options.map((o) => {
        const active = value === o.value
        return (
          <label
            key={o.value}
            className={
              'flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ' +
              (active ? 'border-sage-500 bg-sage-50' : 'border-sage-200 hover:border-sage-300')
            }
          >
            <input
              type="radio"
              name={name}
              value={o.value}
              checked={active}
              onChange={() => onChange(o.value)}
              className="accent-sage-500 mt-0.5"
            />
            <span>
              <span className="block text-sm font-medium text-sage-800">{o.label}</span>
              {o.hint && <span className="block text-xs text-sage-500 mt-0.5">{o.hint}</span>}
            </span>
          </label>
        )
      })}
    </div>
  )
}

function DuplicatesPanel({
  matches, override, onOverride, onUseExisting,
}: {
  matches: PossibleMatch[]
  override: boolean
  onOverride: (v: boolean) => void
  onUseExisting: (id: string) => void
}) {
  const summary = useMemo(() => {
    const byKind = matches.reduce<Record<string, number>>((a, m) => {
      a[m.matched_on] = (a[m.matched_on] ?? 0) + 1
      return a
    }, {})
    return Object.entries(byKind).map(([k, n]) => `${n} by ${k}`).join(', ')
  }, [matches])

  return (
    <div className="bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3">
      <div className="flex items-start gap-2.5">
        <AlertCircle size={18} className="text-amber-600 mt-0.5 shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-amber-900">Possible existing client found</p>
          <p className="text-xs text-amber-800 mt-0.5">{summary}. Open one or create anyway.</p>
          <ul className="mt-2 divide-y divide-amber-100">
            {matches.map((m) => (
              <li key={m.id} className="py-2 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm text-sage-800 font-medium truncate">{m.name}</p>
                  <p className="text-xs text-sage-500 mt-0.5 truncate">
                    {m.company_name ? <>{m.company_name} · </> : null}
                    {m.email ? <>{m.email} · </> : null}
                    {m.phone ?? ''}
                    <span className="ml-1 inline-block text-[10px] uppercase tracking-wide font-semibold text-amber-700 bg-amber-100 rounded-full px-1.5 py-0.5">{m.matched_on}</span>
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => onUseExisting(m.id)}
                  className="shrink-0 inline-flex items-center gap-1 text-xs font-semibold bg-white border border-amber-200 text-amber-800 px-3 py-1.5 rounded-lg hover:bg-amber-100 transition-colors"
                >
                  <Search size={12} />
                  Use existing
                </button>
              </li>
            ))}
          </ul>
          <label className="flex items-center gap-2 mt-2 text-xs text-amber-900 cursor-pointer">
            <input type="checkbox" checked={override} onChange={(e) => onOverride(e.target.checked)} className="accent-amber-600" />
            Create anyway — I&apos;ve checked, this is a different client
          </label>
        </div>
      </div>
    </div>
  )
}
