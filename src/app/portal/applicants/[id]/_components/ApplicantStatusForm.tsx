'use client'

import { useState, useTransition } from 'react'
import { updateApplicantStatus } from '../_actions'

type Status = 'new' | 'reviewing' | 'interview' | 'approved' | 'rejected' | 'converted_to_contractor'

const OPTIONS: { value: Status; label: string }[] = [
  { value: 'new',                     label: 'New' },
  { value: 'reviewing',               label: 'Reviewing' },
  { value: 'interview',               label: 'Interview' },
  { value: 'approved',                label: 'Approved' },
  { value: 'rejected',                label: 'Rejected' },
  { value: 'converted_to_contractor', label: 'Converted to contractor' },
]

export function ApplicantStatusForm({
  applicantId,
  currentStatus,
}: {
  applicantId: string
  // Accept raw string from the DB; cast internally to the Status union.
  currentStatus: string
}) {
  const initial = currentStatus as Status
  const [status, setStatus] = useState<Status>(initial)
  const [pending, startTransition] = useTransition()
  const [flash, setFlash] = useState<'idle' | 'saved' | 'error'>('idle')
  const [errorMessage, setErrorMessage] = useState('')

  function onChange(next: Status) {
    setStatus(next)
    setFlash('idle')
    startTransition(async () => {
      const result = await updateApplicantStatus({ applicantId, status: next })
      if ('error' in result) {
        setFlash('error')
        setErrorMessage(result.error)
        setStatus(initial)
      } else {
        setFlash('saved')
        setTimeout(() => setFlash('idle'), 1500)
      }
    })
  }

  return (
    <div className="flex items-center gap-3">
      <select
        value={status}
        onChange={(e) => onChange(e.target.value as Status)}
        disabled={pending}
        className="border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white text-sage-800 focus:outline-none focus:ring-2 focus:ring-sage-300"
      >
        {OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
      {pending && <span className="text-xs text-sage-500">Saving…</span>}
      {flash === 'saved' && <span className="text-xs text-emerald-600">Saved</span>}
      {flash === 'error' && <span className="text-xs text-red-600">{errorMessage || 'Failed'}</span>}
    </div>
  )
}
