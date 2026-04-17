'use client'

import { useState, useTransition } from 'react'
import { updateWorkerActualHours } from '../_actions'

export function ActualHoursEditor({ jobId, contractorId, currentHours }: { jobId: string; contractorId: string; currentHours: number | null }) {
  const [hours, setHours] = useState(currentHours != null ? String(currentHours) : '')
  const [isPending, startTransition] = useTransition()
  const [saved, setSaved] = useState(false)

  function handleSave() {
    const val = parseFloat(hours) || 0
    setSaved(false)
    startTransition(async () => {
      const result = await updateWorkerActualHours(jobId, contractorId, val)
      if (!result?.error) {
        setSaved(true)
        setTimeout(() => setSaved(false), 2000)
      }
    })
  }

  return (
    <div className="flex items-center gap-1">
      <input
        type="number"
        step="0.25"
        min="0"
        value={hours}
        onChange={(e) => { setHours(e.target.value); setSaved(false) }}
        onBlur={handleSave}
        onKeyDown={(e) => { if (e.key === 'Enter') handleSave() }}
        disabled={isPending}
        className="w-16 rounded border border-sage-200 px-2 py-1 text-xs text-sage-800 text-right focus:outline-none focus:ring-1 focus:ring-sage-500"
      />
      {saved && <span className="text-emerald-600 text-[10px]">✓</span>}
    </div>
  )
}
