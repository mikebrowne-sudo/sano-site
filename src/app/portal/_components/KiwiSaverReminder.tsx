'use client'

// KiwiSaver opt-out reminder for a new casual employee. Shows the right nudge
// for where "today" sits in the day 14–56 opt-out window, lets an admin set
// the start date and mark the opt-out filed. Renders nothing once filed.

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { PiggyBank, Clock, AlertTriangle } from 'lucide-react'
import clsx from 'clsx'
import { kiwiSaverOptOutStatus } from '@/lib/kiwisaver'
import { upsertKiwiSaverOptOut } from '../_actions-kiwisaver'
import { formatDate } from '@/lib/format'

export function KiwiSaverReminder({
  personLabel,
  startDate,
  optOutFiled,
}: {
  personLabel: string
  startDate: string | null
  optOutFiled: boolean
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [dateInput, setDateInput] = useState(startDate ?? '')

  const today = new Date().toISOString().slice(0, 10)
  const r = kiwiSaverOptOutStatus({ startDate, optOutFiled }, today)

  if (r.status === 'filed') return null

  function save(patch: { startDate?: string | null; optOutFiled?: boolean }) {
    startTransition(async () => {
      await upsertKiwiSaverOptOut({ personLabel, ...patch })
      router.refresh()
    })
  }

  // No start date yet → prompt to set it.
  if (r.status === 'no_start') {
    return (
      <div className="rounded-xl border border-sage-200 bg-white px-5 py-3 flex flex-wrap items-center gap-3">
        <span className="flex items-center gap-2 text-sm text-sage-700">
          <PiggyBank size={15} className="text-sage-500" />
          Set {personLabel}’s start date to track her KiwiSaver opt-out window.
        </span>
        <div className="ml-auto flex items-center gap-2">
          <input
            type="date"
            value={dateInput}
            onChange={(e) => setDateInput(e.target.value)}
            className="rounded-lg border border-sage-200 px-3 py-1.5 text-sm text-sage-800 focus:outline-none focus:ring-2 focus:ring-sage-500"
          />
          <button
            type="button"
            disabled={!dateInput || isPending}
            onClick={() => save({ startDate: dateInput })}
            className="bg-sage-500 text-white font-semibold px-3 py-1.5 rounded-lg text-sm hover:bg-sage-700 disabled:opacity-50"
          >
            Save
          </button>
        </div>
      </div>
    )
  }

  const tone =
    r.status === 'in_window' ? 'amber' : r.status === 'after_window' ? 'red' : 'sage'
  const toneCls =
    tone === 'amber' ? 'border-amber-200 bg-amber-50 text-amber-800'
    : tone === 'red' ? 'border-red-200 bg-red-50 text-red-800'
    : 'border-sage-200 bg-white text-sage-700'
  const Icon = tone === 'red' ? AlertTriangle : tone === 'amber' ? Clock : PiggyBank

  const message =
    r.status === 'before_window'
      ? `${personLabel}’s KiwiSaver opt-out window opens ${formatDate(r.windowStart!)} (in ${r.daysUntilOpen} day${r.daysUntilOpen === 1 ? '' : 's'}). She files a KS10 in myIR then.`
      : r.status === 'in_window'
        ? `${personLabel}’s KiwiSaver opt-out window is open — file her KS10 (in myIR) by ${formatDate(r.windowEnd!)}. ${r.daysLeft} day${r.daysLeft === 1 ? '' : 's'} left.`
        : `${personLabel}’s KiwiSaver opt-out window has passed — she’ll need to opt out directly through IRD now.`

  return (
    <div className={clsx('rounded-xl border px-5 py-3 flex flex-wrap items-center gap-3', toneCls)}>
      <span className="flex items-center gap-2 text-sm font-medium">
        <Icon size={15} className="shrink-0" />
        {message}
      </span>
      {(r.status === 'in_window' || r.status === 'after_window') && (
        <button
          type="button"
          disabled={isPending}
          onClick={() => save({ optOutFiled: true })}
          className="ml-auto bg-white border border-black/10 text-current font-semibold px-3 py-1.5 rounded-lg text-xs hover:bg-sage-50 disabled:opacity-50"
        >
          Mark opt-out filed
        </button>
      )}
    </div>
  )
}
