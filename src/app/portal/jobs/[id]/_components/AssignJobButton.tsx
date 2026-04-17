'use client'

import { useState, useTransition } from 'react'
import { assignJob } from '../_actions'
import { UserPlus, X } from 'lucide-react'

export function AssignJobButton({
  jobId,
  currentAssignee,
}: {
  jobId: string
  currentAssignee: string | null
}) {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState(currentAssignee ?? '')
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  function handleSave() {
    setError(null)
    startTransition(async () => {
      const result = await assignJob(jobId, name)
      if (result?.error) {
        setError(result.error)
      } else {
        setSaved(true)
        setOpen(false)
        setTimeout(() => setSaved(false), 3000)
      }
    })
  }

  if (saved) {
    return (
      <span className="inline-flex items-center gap-1.5 text-sm text-emerald-700 font-medium">
        Assigned to {name}
      </span>
    )
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 border border-sage-200 text-sage-700 font-medium px-4 py-2.5 rounded-lg text-sm hover:bg-sage-50 transition-colors"
      >
        <UserPlus size={16} />
        {currentAssignee ? 'Reassign' : 'Assign Job'}
      </button>
    )
  }

  return (
    <div className="bg-white border border-sage-200 rounded-lg p-4 space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-sage-800">
          {currentAssignee ? 'Reassign Job' : 'Assign Job'}
        </span>
        <button type="button" onClick={() => setOpen(false)} className="text-sage-400 hover:text-sage-600">
          <X size={16} />
        </button>
      </div>
      <label className="block">
        <span className="block text-sm font-semibold text-sage-800 mb-1.5">Staff / contractor name</span>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Carol, Michael"
          className="w-full rounded-lg border border-sage-200 px-4 py-3 text-sage-800 placeholder:text-sage-300 focus:outline-none focus:ring-2 focus:ring-sage-500 focus:border-transparent text-sm"
        />
      </label>
      {error && <p className="text-red-600 text-xs">{error}</p>}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={handleSave}
          disabled={isPending}
          className="inline-flex items-center gap-2 bg-sage-500 text-white font-semibold px-4 py-2.5 rounded-lg text-sm hover:bg-sage-700 transition-colors disabled:opacity-50"
        >
          {isPending ? 'Saving…' : 'Assign'}
        </button>
        <button type="button" onClick={() => setOpen(false)} className="text-sm text-sage-600 hover:text-sage-800">
          Cancel
        </button>
      </div>
    </div>
  )
}
