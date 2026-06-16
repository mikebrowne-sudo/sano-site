'use client'

// Stage 2A — choose the contact PERSON for a quote from the selected
// account's contacts (the existing `contacts` table). Selecting one sets
// quotes.contact_id and snapshots the person's name/email/phone, so the
// email greeting (Stage 1) and recipient resolve to a real person rather
// than the account/company name. Free-text entry stays available for
// backwards compatibility; this just makes the existing contacts usable.

export interface QuoteContact {
  id: string
  client_id: string | null
  full_name: string | null
  contact_type: string | null
  email: string | null
  phone: string | null
}

/** Contacts belonging to one account, primary first then by name. */
export function contactsForClient(contacts: QuoteContact[], clientId: string | null | undefined): QuoteContact[] {
  if (!clientId) return []
  return contacts
    .filter((c) => c.client_id === clientId)
    .sort((a, b) => {
      const ap = a.contact_type === 'primary' ? 0 : 1
      const bp = b.contact_type === 'primary' ? 0 : 1
      if (ap !== bp) return ap - bp
      return (a.full_name ?? '').localeCompare(b.full_name ?? '')
    })
}

export function contactOptionLabel(c: QuoteContact): string {
  const name = (c.full_name ?? '').trim() || '(no name)'
  const parts = [name]
  if (c.email) parts.push(c.email)
  const base = parts.join(' — ')
  return c.contact_type === 'accounts' ? `${base} [accounts]` : base
}

export function ContactPicker({
  contacts,
  clientId,
  value,
  onChange,
}: {
  contacts: QuoteContact[]
  clientId: string | null
  value: string
  onChange: (id: string, contact: QuoteContact | null) => void
}) {
  const options = contactsForClient(contacts, clientId)

  return (
    <label className="block">
      <span className="block text-sm font-semibold text-sage-800 mb-1.5">Contact person for this quote</span>
      {options.length === 0 ? (
        <p className="text-xs text-sage-500 bg-sage-50 rounded-lg px-3 py-2">
          No saved contacts for this account yet — the quote can still be created (it&apos;ll greet with
          &ldquo;Hi there,&rdquo;). You can type a contact below, or add one to the account.
        </p>
      ) : (
        <>
          <select
            value={value}
            onChange={(e) => {
              const id = e.target.value
              onChange(id, options.find((o) => o.id === id) ?? null)
            }}
            className="w-full rounded-lg border border-sage-200 px-3 py-2 text-sm text-sage-800 focus:outline-none focus:ring-2 focus:ring-sage-500"
          >
            <option value="">No contact selected yet</option>
            {options.map((c) => (
              <option key={c.id} value={c.id}>{contactOptionLabel(c)}</option>
            ))}
          </select>
          <span className="block text-[11px] text-sage-500 mt-1">
            Pick the person who booked the job / sent the work order. Their name + email fill the contact fields below.
          </span>
        </>
      )}
    </label>
  )
}
