'use client'

import { useState, useTransition } from 'react'
import { contractorUpdateNotes } from '../_actions'
import { CheckCircle } from 'lucide-react'

export function ContractorNotesForm({ jobId, currentNotes }: { jobId: string; currentNotes: string }) {
  const [notes, setNotes] = useState(currentNotes)
  const [isPending, startTransition] = useTransition()
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const hasChanged = notes !== currentNotes

  function handleSave() {
    setError(null)
    setSaved(false)
    startTransition(async () => {
      const result = await contractorUpdateNotes(jobId, notes)
      if (result?.error) {
        setError(result.error)
      } else {
        setSaved(true)
        setTimeout(() => setSaved(false), 3000)
      }
    })
  }

  return (
    <div className="space-y-3">
      <textarea
        rows={4}
        value={notes}
        onChange={(e) => { setNotes(e.target.value); setSaved(false) }}
        placeholder="Add notes about this job…"
        className="w-full rounded-xl border border-sage-200 px-4 py-3 text-sage-800 placeholder:text-sage-300 focus:outline-none focus:ring-2 focus:ring-sage-500 focus:border-transparent text-sm resize-y"
      />
      <div className="flex items-center gap-3">
        <button
          onClick={handleSave}
          disabled={isPending || !hasChanged}
          className="flex-1 sm:flex-none bg-sage-500 text-white font-semibold px-5 py-3 rounded-xl text-sm hover:bg-sage-700 active:bg-sage-800 transition-colors disabled:opacity-40"
        >
          {isPending ? 'Saving…' : 'Save Notes'}
        </button>
        {saved && (
          <span className="inline-flex items-center gap-1.5 text-sm text-emerald-700 font-medium">
            <CheckCircle size={14} />
            Saved
          </span>
        )}
        {error && <span className="text-sm text-red-600">{error}</span>}
      </div>
    </div>
  )
}
