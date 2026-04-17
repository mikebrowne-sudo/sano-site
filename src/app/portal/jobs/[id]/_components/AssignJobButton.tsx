'use client'

import { useState, useTransition } from 'react'
import { assignJob } from '../_actions'
import { UserPlus, X, ChevronDown } from 'lucide-react'

interface Contractor {
  id: string
  full_name: string
}

export function AssignJobButton({
  jobId,
  currentAssignee,
  currentContractorId,
  contractors,
}: {
  jobId: string
  currentAssignee: string | null
  currentContractorId: string | null
  contractors: Contractor[]
}) {
  const [open, setOpen] = useState(false)
  const [selectedId, setSelectedId] = useState(currentContractorId ?? '')
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [savedName, setSavedName] = useState<string | null>(null)

  function handleSave() {
    setError(null)
    if (!selectedId) {
      setError('Please select a contractor.')
      return
    }
    startTransition(async () => {
      const result = await assignJob(jobId, selectedId)
      if (result?.error) {
        setError(result.error)
      } else {
        const c = contractors.find((ct) => ct.id === selectedId)
        setSavedName(c?.full_name ?? 'Assigned')
        setOpen(false)
        setTimeout(() => setSavedName(null), 3000)
      }
    })
  }

  if (savedName) {
    return (
      <span className="inline-flex items-center gap-1.5 text-sm text-emerald-700 font-medium">
        Assigned to {savedName}
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
        <span className="block text-sm font-semibold text-sage-800 mb-1.5">Contractor</span>
        <div className="relative">
          <select
            value={selectedId}
            onChange={(e) => setSelectedId(e.target.value)}
            className="w-full appearance-none rounded-lg border border-sage-200 px-4 py-3 pr-10 text-sage-800 focus:outline-none focus:ring-2 focus:ring-sage-500 focus:border-transparent text-sm bg-white"
          >
            <option value="">Select contractor…</option>
            {contractors.map((c) => (
              <option key={c.id} value={c.id}>{c.full_name}</option>
            ))}
          </select>
          <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-sage-400 pointer-events-none" />
        </div>
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
