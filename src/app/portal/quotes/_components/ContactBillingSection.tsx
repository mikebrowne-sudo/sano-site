'use client'

// Contact & Billing Details — Phase 5D
//
// Universal section used by NewQuoteForm and EditQuoteForm for ALL
// quote categories (residential / property_management / airbnb /
// commercial). Captures the primary site contact, the accounts /
// billing contact, and the client reference / PO requirement —
// quote-level overrides that the invoice flow snapshots and uses
// when routing invoices.
//
// All fields are quote-level overrides — they DO NOT replace the
// client record. Optional. Plain Tailwind primitives, matching the
// existing form patterns.

// ── Form-state type ────────────────────────────────────────────────

export interface ContactBillingFormState {
  contact_name: string
  contact_email: string
  contact_phone: string
  accounts_contact_name: string
  accounts_email: string
  client_reference: string
  requires_po: boolean
}

export function emptyContactBilling(): ContactBillingFormState {
  return {
    contact_name: '',
    contact_email: '',
    contact_phone: '',
    accounts_contact_name: '',
    accounts_email: '',
    client_reference: '',
    requires_po: false,
  }
}

/** Hydrate from a quotes-table row (or anything with the same columns). */
export function hydrateContactBilling(row: {
  contact_name?: string | null
  contact_email?: string | null
  contact_phone?: string | null
  accounts_contact_name?: string | null
  accounts_email?: string | null
  client_reference?: string | null
  requires_po?: boolean | null
} | null | undefined): ContactBillingFormState {
  if (!row) return emptyContactBilling()
  return {
    contact_name:           row.contact_name           ?? '',
    contact_email:          row.contact_email          ?? '',
    contact_phone:          row.contact_phone          ?? '',
    accounts_contact_name:  row.accounts_contact_name  ?? '',
    accounts_email:         row.accounts_email         ?? '',
    client_reference:       row.client_reference       ?? '',
    requires_po:            row.requires_po            ?? false,
  }
}

function emptyToNull(v: string): string | null {
  const t = v.trim()
  return t === '' ? null : t
}

/** Form state → server-action payload shape. Trims whitespace and
 *  converts empty strings to null so the DB sees clean values. */
export interface ContactBillingInput {
  contact_name: string | null
  contact_email: string | null
  contact_phone: string | null
  accounts_contact_name: string | null
  accounts_email: string | null
  client_reference: string | null
  requires_po: boolean
}

export function toContactBillingInput(state: ContactBillingFormState): ContactBillingInput {
  return {
    contact_name:           emptyToNull(state.contact_name),
    contact_email:          emptyToNull(state.contact_email),
    contact_phone:          emptyToNull(state.contact_phone),
    accounts_contact_name:  emptyToNull(state.accounts_contact_name),
    accounts_email:         emptyToNull(state.accounts_email),
    client_reference:       emptyToNull(state.client_reference),
    requires_po:            state.requires_po,
  }
}

// ── Component ──────────────────────────────────────────────────────

export function ContactBillingSection({
  value,
  onChange,
  disabled = false,
}: {
  value: ContactBillingFormState
  onChange: (next: ContactBillingFormState) => void
  disabled?: boolean
}) {
  function set<K extends keyof ContactBillingFormState>(
    k: K,
    v: ContactBillingFormState[K],
  ) {
    onChange({ ...value, [k]: v })
  }

  return (
    <fieldset className="border border-sage-100 rounded-xl bg-white p-5">
      <legend className="text-lg font-semibold text-sage-800 px-2">Contact &amp; Billing Details</legend>
      <p className="text-xs text-sage-500 mt-1 mb-4 px-2">
        Optional overrides for this quote. The client record is used unless these are filled in.
        Accounts email — when set — is where the invoice will be sent.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Text
          label="Primary contact name"
          value={value.contact_name}
          onChange={(v) => set('contact_name', v)}
          placeholder="Site contact"
          disabled={disabled}
        />
        <Text
          label="Primary contact email"
          value={value.contact_email}
          onChange={(v) => set('contact_email', v)}
          placeholder="name@client.co.nz"
          disabled={disabled}
        />
        <Text
          label="Primary contact phone"
          value={value.contact_phone}
          onChange={(v) => set('contact_phone', v)}
          placeholder="021 …"
          disabled={disabled}
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
        <Text
          label="Accounts contact name (optional)"
          value={value.accounts_contact_name}
          onChange={(v) => set('accounts_contact_name', v)}
          placeholder="Finance / accounts contact"
          disabled={disabled}
        />
        <Text
          label="Accounts email"
          value={value.accounts_email}
          onChange={(v) => set('accounts_email', v)}
          placeholder="accounts@client.co.nz"
          disabled={disabled}
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4 items-end">
        <Text
          label="Client reference / PO number"
          value={value.client_reference}
          onChange={(v) => set('client_reference', v)}
          placeholder="e.g. PO-12345 or work order ref"
          disabled={disabled}
        />
        <label className={`flex items-start gap-2.5 text-sm text-sage-800 pb-2 ${disabled ? 'opacity-50' : 'cursor-pointer'}`}>
          <input
            type="checkbox"
            checked={value.requires_po}
            onChange={(e) => set('requires_po', e.target.checked)}
            disabled={disabled}
            className="mt-0.5 h-4 w-4 rounded border-sage-300 text-sage-600 focus:ring-sage-500"
          />
          <span>Client requires a PO before invoicing</span>
        </label>
      </div>
    </fieldset>
  )
}

function Text({
  label, value, onChange, placeholder, disabled,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
  disabled?: boolean
}) {
  return (
    <label className="block">
      <span className="block text-sm font-semibold text-sage-800 mb-1.5">{label}</span>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        className="w-full rounded-lg border border-sage-200 px-3 py-2 text-sage-800 placeholder:text-sage-300 focus:outline-none focus:ring-2 focus:ring-sage-500 text-sm disabled:opacity-50 disabled:bg-sage-50"
      />
    </label>
  )
}
