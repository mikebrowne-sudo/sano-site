'use client'

// Contractor Profile — emergency contact. Editable by the worker; shown
// read-only in the staff "Preview as contractor" tool.

import { useState, useTransition } from 'react'
import { HeartPulse, Loader2, Check } from 'lucide-react'
import { saveEmergencyContact } from '../profile/_actions'

export interface EmergencyContactValue {
  name: string
  phone: string
  relationship: string
}

export function EmergencyContactCard({
  initial,
  readOnly = false,
}: {
  initial: EmergencyContactValue
  readOnly?: boolean
}) {
  const [name, setName] = useState(initial.name)
  const [phone, setPhone] = useState(initial.phone)
  const [relationship, setRelationship] = useState(initial.relationship)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)
  const [isPending, startTransition] = useTransition()

  const isMissing = !initial.name || !initial.phone
  const input =
    'w-full rounded-xl border border-sage-200 px-4 py-3 text-base text-sage-800 bg-white focus:outline-none focus:ring-2 focus:ring-sage-500 disabled:bg-sage-50 disabled:text-sage-500'

  function save() {
    setError(null)
    setSaved(false)
    startTransition(async () => {
      const res = await saveEmergencyContact({ name, phone, relationship })
      if ('error' in res) { setError(res.error); return }
      setSaved(true)
    })
  }

  return (
    <section className="bg-white rounded-2xl border border-sage-100 p-5">
      <h2 className="flex items-center gap-2 text-base font-semibold text-sage-800">
        <HeartPulse size={16} className={isMissing ? 'text-amber-500' : 'text-sage-400'} />
        Emergency contact
      </h2>
      <p className="text-xs text-sage-500 mt-0.5 mb-4">Who should we call if something happens while you’re on a job?</p>

      <div className="space-y-3">
        <label className="block">
          <span className="block text-sm font-medium text-sage-700 mb-1">Name</span>
          <input value={name} onChange={(e) => setName(e.target.value)} disabled={readOnly} autoComplete="off" className={input} />
        </label>
        <label className="block">
          <span className="block text-sm font-medium text-sage-700 mb-1">Phone</span>
          <input value={phone} onChange={(e) => setPhone(e.target.value)} disabled={readOnly} type="tel" inputMode="tel" autoComplete="off" className={input} placeholder="e.g. 021 123 4567" />
        </label>
        <label className="block">
          <span className="block text-sm font-medium text-sage-700 mb-1">Relationship <span className="font-normal text-sage-400">(optional)</span></span>
          <input value={relationship} onChange={(e) => setRelationship(e.target.value)} disabled={readOnly} className={input} placeholder="e.g. Partner, Parent" />
        </label>
      </div>

      {error && <p className="text-sm text-red-600 mt-3">{error}</p>}

      {!readOnly && (
        <button
          type="button"
          onClick={save}
          disabled={isPending}
          className="mt-4 w-full inline-flex items-center justify-center gap-2 bg-sage-500 text-white font-semibold px-4 py-3 rounded-xl text-sm hover:bg-sage-700 disabled:opacity-50"
        >
          {isPending ? <Loader2 size={16} className="animate-spin" /> : saved ? <Check size={16} /> : null}
          {isPending ? 'Saving…' : saved ? 'Saved' : 'Save emergency contact'}
        </button>
      )}
    </section>
  )
}
