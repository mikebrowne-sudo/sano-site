'use client'

import { useState, useTransition } from 'react'
import { updateApplicantNotes } from '../_actions'

export function ApplicantNotesForm({
  applicantId,
  initialNotes,
}: {
  applicantId: string
  initialNotes: string
}) {
  const [notes, setNotes] = useState(initialNotes)
  const [pending, startTransition] = useTransition()
  const [flash, setFlash] = useState<'idle' | 'saved' | 'error'>('idle')
  const [errorMessage, setErrorMessage] = useState('')

  const dirty = notes !== initialNotes

  function onSave() {
    setFlash('idle')
    startTransition(async () => {
      const result = await updateApplicantNotes({ applicantId, notes })
      if ('error' in result) {
        setFlash('error')
        setErrorMessage(result.error)
      } else {
        setFlash('saved')
        setTimeout(() => setFlash('idle'), 1500)
      }
    })
  }

  return (
    <div>
      <textarea
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        rows={4}
        placeholder="Internal notes (not shown to applicant)…"
        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white text-sage-800 focus:outline-none focus:ring-2 focus:ring-sage-300"
      />
      <div className="flex items-center gap-3 mt-2">
        <button
          type="button"
          onClick={onSave}
          disabled={!dirty || pending}
          className="inline-flex items-center gap-2 bg-sage-500 text-white font-semibold px-4 py-2 rounded-lg text-sm hover:bg-sage-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {pending ? 'Saving…' : 'Save notes'}
        </button>
        {flash === 'saved' && <span className="text-xs text-emerald-600">Saved</span>}
        {flash === 'error' && <span className="text-xs text-red-600">{errorMessage || 'Failed'}</span>}
      </div>
    </div>
  )
}
