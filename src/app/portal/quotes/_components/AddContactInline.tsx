'use client'

// Stage 2B — quick "Add contact" under the contact picker. Saves a new
// contact to the selected account and hands it back so it becomes the
// selected contact for the quote. Inline (no modal) to match the form.

import { useState, useTransition } from 'react'
import { UserPlus, X } from 'lucide-react'
import clsx from 'clsx'
import { createContact } from '../../clients/_actions-contacts'
import type { QuoteContact } from './ContactPicker'

export function AddContactInline({
  clientId,
  onAdded,
}: {
  clientId: string
  onAdded: (c: QuoteContact) => void
}) {
  const [open, setOpen] = useState(false)
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [type, setType] = useState<'primary' | 'accounts'>('primary')
  const [err, setErr] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  function reset() {
    setFullName(''); setEmail(''); setPhone(''); setType('primary'); setErr(null)
  }

  function save() {
    setErr(null)
    if (!fullName.trim()) { setErr('Contact name is required.'); return }
    startTransition(async () => {
      const res = await createContact({
        client_id: clientId,
        full_name: fullName,
        email: email || null,
        phone: phone || null,
        contact_type: type,
      })
      if (res.error || !res.contact) { setErr(res.error ?? 'Could not add contact.'); return }
      onAdded(res.contact)
      reset()
      setOpen(false)
    })
  }

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)}
        className="mt-2 inline-flex items-center gap-1.5 text-xs font-medium text-sage-600 hover:text-sage-800">
        <UserPlus size={13} /> Add contact
      </button>
    )
  }

  const input = 'w-full rounded-lg border border-sage-200 px-3 py-2 text-sm text-sage-800 focus:outline-none focus:ring-2 focus:ring-sage-500'

  return (
    <div className="mt-2 rounded-lg border border-sage-200 bg-sage-50 p-3 space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-sage-700">Add a contact to this account</span>
        <button type="button" onClick={() => { reset(); setOpen(false) }} className="text-sage-400 hover:text-sage-600" aria-label="Cancel">
          <X size={14} />
        </button>
      </div>
      <input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Full name" className={input} aria-label="Full name" />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" className={input} aria-label="Email" />
        <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Phone (optional)" className={input} aria-label="Phone" />
      </div>
      <select value={type} onChange={(e) => setType(e.target.value as 'primary' | 'accounts')} className={input} aria-label="Contact type">
        <option value="primary">Primary contact</option>
        <option value="accounts">Accounts contact</option>
      </select>
      {err && <p className="text-xs text-red-600">{err}</p>}
      <div className="flex items-center gap-2">
        <button type="button" onClick={save} disabled={pending}
          className={clsx('inline-flex items-center gap-1.5 bg-sage-500 text-white font-medium px-3 py-1.5 rounded-md text-xs hover:bg-sage-700 disabled:opacity-50')}>
          <UserPlus size={13} /> {pending ? 'Saving…' : 'Save contact'}
        </button>
        <button type="button" onClick={() => { reset(); setOpen(false) }} className="text-xs text-sage-500 hover:text-sage-700">Cancel</button>
      </div>
    </div>
  )
}
