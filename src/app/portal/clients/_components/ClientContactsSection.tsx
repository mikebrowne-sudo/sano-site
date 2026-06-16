'use client'

// Account-level Contacts management on the client page. Lists the real
// people under the account and lets staff add / edit them. Reuses the
// createContact / updateContact actions (same contacts table the quote
// picker reads). No delete for now (no safe soft-delete on contacts yet).

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { UserPlus, Pencil, X, Loader2, Mail, Phone, StickyNote } from 'lucide-react'
import clsx from 'clsx'
import { createContact, updateContact, type AccountContact } from '../_actions-contacts'

export function ClientContactsSection({
  clientId,
  contacts: initial,
}: {
  clientId: string
  contacts: AccountContact[]
}) {
  const router = useRouter()
  const [contacts, setContacts] = useState<AccountContact[]>(initial)
  const [adding, setAdding] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)

  function onSaved(c: AccountContact, mode: 'add' | 'edit') {
    setContacts((prev) => (mode === 'add' ? [...prev, c] : prev.map((x) => (x.id === c.id ? c : x))))
    setAdding(false)
    setEditingId(null)
    router.refresh()
  }

  return (
    <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 mb-6">
      <div className="flex items-center justify-between gap-3 mb-1">
        <h2 className="text-base font-semibold text-sage-800">Contacts</h2>
        {!adding && (
          <button type="button" onClick={() => { setEditingId(null); setAdding(true) }}
            className="inline-flex items-center gap-2 bg-sage-500 text-white font-medium px-3 py-1.5 rounded-lg text-sm hover:bg-sage-700 transition-colors">
            <UserPlus size={15} /> Add contact
          </button>
        )}
      </div>
      <p className="text-xs text-sage-500 mb-4 max-w-2xl">
        Add property managers, agents, booking contacts, and accounts contacts here. The account is the
        branch/company; contacts are the people under it. They appear in the contact dropdown when creating a quote.
      </p>

      {adding && (
        <div className="mb-4">
          <ContactForm clientId={clientId} onSaved={(c) => onSaved(c, 'add')} onCancel={() => setAdding(false)} />
        </div>
      )}

      {contacts.length === 0 && !adding ? (
        <p className="text-sm text-sage-400 py-2">No contacts yet. Add the property manager / booking contact for this account.</p>
      ) : (
        <ul className="divide-y divide-sage-100">
          {contacts.map((c) => (
            <li key={c.id} className="py-3">
              {editingId === c.id ? (
                <ContactForm clientId={clientId} contact={c} onSaved={(u) => onSaved(u, 'edit')} onCancel={() => setEditingId(null)} />
              ) : (
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-sage-800">{c.full_name || '(no name)'}</span>
                      <TypeBadge type={c.contact_type} />
                    </div>
                    <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-sage-600">
                      {c.email && <span className="inline-flex items-center gap-1"><Mail size={12} className="text-sage-400" /> {c.email}</span>}
                      {c.phone && <span className="inline-flex items-center gap-1"><Phone size={12} className="text-sage-400" /> {c.phone}</span>}
                    </div>
                    {c.notes && <div className="mt-1 inline-flex items-start gap-1 text-[11px] text-sage-500"><StickyNote size={12} className="mt-0.5 text-sage-400 shrink-0" /> {c.notes}</div>}
                  </div>
                  <button type="button" onClick={() => { setAdding(false); setEditingId(c.id) }}
                    className="inline-flex items-center gap-1.5 text-sage-500 hover:text-sage-800 text-xs font-medium shrink-0">
                    <Pencil size={13} /> Edit
                  </button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

function TypeBadge({ type }: { type: string | null }) {
  const t = type === 'accounts' ? 'accounts' : 'primary'
  return (
    <span className={clsx('text-[10px] px-1.5 py-0.5 rounded-full font-medium capitalize',
      t === 'accounts' ? 'bg-blue-50 text-blue-700' : 'bg-sage-100 text-sage-700')}>
      {t}
    </span>
  )
}

function ContactForm({
  clientId,
  contact,
  onSaved,
  onCancel,
}: {
  clientId: string
  contact?: AccountContact
  onSaved: (c: AccountContact) => void
  onCancel: () => void
}) {
  const [fullName, setFullName] = useState(contact?.full_name ?? '')
  const [email, setEmail] = useState(contact?.email ?? '')
  const [phone, setPhone] = useState(contact?.phone ?? '')
  const [type, setType] = useState<'primary' | 'accounts'>(contact?.contact_type === 'accounts' ? 'accounts' : 'primary')
  const [notes, setNotes] = useState(contact?.notes ?? '')
  const [err, setErr] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  const input = 'w-full rounded-lg border border-sage-200 px-3 py-2 text-sm text-sage-800 focus:outline-none focus:ring-2 focus:ring-sage-500'

  function save() {
    setErr(null)
    if (!fullName.trim()) { setErr('Contact name is required.'); return }
    startTransition(async () => {
      const res = contact
        ? await updateContact({ id: contact.id, full_name: fullName, email, phone, contact_type: type, notes })
        : await createContact({ client_id: clientId, full_name: fullName, email, phone, contact_type: type, notes })
      if (res.error || !res.contact) { setErr(res.error ?? 'Could not save contact.'); return }
      onSaved(res.contact)
    })
  }

  return (
    <div className="rounded-lg border border-sage-200 bg-sage-50 p-3 space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-sage-700">{contact ? 'Edit contact' : 'Add a contact'}</span>
        <button type="button" onClick={onCancel} className="text-sage-400 hover:text-sage-600" aria-label="Cancel"><X size={14} /></button>
      </div>
      <input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Full name" className={input} aria-label="Full name" />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" className={input} aria-label="Email" />
        <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Phone" className={input} aria-label="Phone" />
      </div>
      <select value={type} onChange={(e) => setType(e.target.value as 'primary' | 'accounts')} className={input} aria-label="Contact type">
        <option value="primary">Primary contact</option>
        <option value="accounts">Accounts contact</option>
      </select>
      <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Notes (e.g. Property manager, branch rental inbox)" rows={2} className={clsx(input, 'resize-y')} aria-label="Notes" />
      {err && <p className="text-xs text-red-600">{err}</p>}
      <div className="flex items-center gap-2">
        <button type="button" onClick={save} disabled={pending}
          className="inline-flex items-center gap-1.5 bg-sage-500 text-white font-medium px-3 py-1.5 rounded-md text-xs hover:bg-sage-700 disabled:opacity-50">
          {pending ? <Loader2 size={13} className="animate-spin" /> : <UserPlus size={13} />}
          {pending ? 'Saving…' : (contact ? 'Save changes' : 'Save contact')}
        </button>
        <button type="button" onClick={onCancel} className="text-xs text-sage-500 hover:text-sage-700">Cancel</button>
      </div>
    </div>
  )
}
