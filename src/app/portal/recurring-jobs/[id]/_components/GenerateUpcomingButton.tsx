'use client'

// Phase F — multi-week job generator for recurring contracts.
//
// Sits next to the existing single-next-due GenerateJobButton.
// Calls generateUpcomingRecurringJobs with a window of 1 / 2 / 4
// weeks. Confirmation flash shows how many jobs were created vs
// skipped (existing schedule duplicates).

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { CalendarPlus } from 'lucide-react'
import { generateUpcomingRecurringJobs } from '../../_actions-phase-f'

const WINDOW_OPTIONS: { weeks: number; label: string }[] = [
  { weeks: 1, label: 'Next 1 week'  },
  { weeks: 2, label: 'Next 2 weeks' },
  { weeks: 4, label: 'Next 4 weeks' },
]

export function GenerateUpcomingButton({ recurringId }: { recurringId: string }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [flash, setFlash] = useState<string | null>(null)

  function run(weeks: number) {
    setError(null)
    setFlash(null)
    startTransition(async () => {
      const result = await generateUpcomingRecurringJobs({ recurringJobId: recurringId, weeks })
      if ('error' in result) {
        setError(result.error)
        return
      }
      setFlash(`Created ${result.createdCount} job${result.createdCount === 1 ? '' : 's'}, skipped ${result.skippedCount} duplicate${result.skippedCount === 1 ? '' : 's'}.`)
      setOpen(false)
      router.refresh()
      window.setTimeout(() => setFlash(null), 4000)
    })
  }

  if (flash) {
    return (
      <span className="inline-flex items-center gap-2 text-xs text-emerald-700 font-medium bg-emerald-50 border border-emerald-200 px-2.5 py-1.5 rounded-md">
        {flash}
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
        <CalendarPlus size={16} />
        Generate Upcoming
      </button>
    )
  }

  return (
    <div className="bg-white border border-sage-200 rounded-lg p-3 space-y-2 w-full max-w-xs shadow-sm">
      <div className="text-xs font-semibold text-sage-700 uppercase tracking-wide mb-1">
        Generate jobs for…
      </div>
      <div className="flex flex-col gap-1.5">
        {WINDOW_OPTIONS.map((opt) => (
          <button
            key={opt.weeks}
            type="button"
            onClick={() => run(opt.weeks)}
            disabled={isPending}
            className="inline-flex items-center gap-2 bg-sage-500 text-white font-medium px-3 py-2 rounded-md text-sm hover:bg-sage-700 transition-colors disabled:opacity-50"
          >
            {opt.label}
          </button>
        ))}
      </div>
      <button
        type="button"
        onClick={() => setOpen(false)}
        className="text-xs text-sage-500 hover:text-sage-700"
      >
        Cancel
      </button>
      {error && <p className="text-red-600 text-xs">{error}</p>}
    </div>
  )
}
