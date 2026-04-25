'use client'

// Phase F — renewal reminders panel.
//
// Lists pending + completed reminders for a contract. Each pending
// row gets Mark complete / Dismiss buttons. Done reminders render
// dim with their completion timestamp so the operator can see what
// was actioned.

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { CheckCircle, X, Bell } from 'lucide-react'
import { updateRecurringReminder } from '../../_actions-phase-f'

export interface ReminderRow {
  id: string
  reminder_type: 'six_weeks' | 'four_weeks' | 'two_weeks'
  due_date: string
  status: 'pending' | 'completed' | 'dismissed'
  completed_at: string | null
}

const TYPE_LABEL: Record<ReminderRow['reminder_type'], string> = {
  six_weeks:  '6 weeks before contract end',
  four_weeks: '4 weeks before contract end',
  two_weeks:  '2 weeks before contract end',
}

function fmtDate(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-NZ', { day: 'numeric', month: 'short', year: 'numeric' })
}

function fmtDateTime(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('en-NZ', { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' })
}

export function RemindersPanel({ reminders }: { reminders: ReminderRow[] }) {
  const router = useRouter()
  const [pendingId, setPendingId] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function update(reminderId: string, status: 'completed' | 'dismissed') {
    setError(null)
    setPendingId(reminderId)
    startTransition(async () => {
      const result = await updateRecurringReminder({ reminderId, status })
      if ('error' in result) {
        setError(result.error)
        setPendingId(null)
        return
      }
      setPendingId(null)
      router.refresh()
    })
  }

  if (reminders.length === 0) {
    return (
      <p className="text-sage-500 text-sm">
        No reminders. Reminders are created when a contract has an end date.
      </p>
    )
  }

  return (
    <div className="space-y-2">
      {reminders.map((r) => {
        const isDone = r.status !== 'pending'
        return (
          <div
            key={r.id}
            className={
              isDone
                ? 'flex items-center justify-between gap-3 rounded-lg border border-gray-100 bg-gray-50 px-4 py-2.5 text-sm opacity-70'
                : 'flex items-center justify-between gap-3 rounded-lg border border-sage-200 bg-white px-4 py-2.5 text-sm'
            }
          >
            <div className="flex items-center gap-2.5">
              <Bell size={14} className={isDone ? 'text-gray-400' : 'text-sage-500'} />
              <div>
                <div className={isDone ? 'font-medium text-gray-600 line-through' : 'font-medium text-sage-800'}>
                  {TYPE_LABEL[r.reminder_type]}
                </div>
                <div className="text-xs text-sage-500">
                  Due {fmtDate(r.due_date)}
                  {r.status === 'completed' && r.completed_at && (
                    <> · completed {fmtDateTime(r.completed_at)}</>
                  )}
                  {r.status === 'dismissed' && r.completed_at && (
                    <> · dismissed {fmtDateTime(r.completed_at)}</>
                  )}
                </div>
              </div>
            </div>

            {!isDone && (
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => update(r.id, 'completed')}
                  disabled={isPending && pendingId === r.id}
                  className="inline-flex items-center gap-1 text-xs bg-sage-500 text-white px-2.5 py-1.5 rounded-md hover:bg-sage-700 transition-colors disabled:opacity-50"
                >
                  <CheckCircle size={12} /> Mark done
                </button>
                <button
                  type="button"
                  onClick={() => update(r.id, 'dismissed')}
                  disabled={isPending && pendingId === r.id}
                  className="inline-flex items-center gap-1 text-xs text-sage-500 hover:text-sage-800 px-2 py-1.5 transition-colors disabled:opacity-50"
                >
                  <X size={12} /> Dismiss
                </button>
              </div>
            )}
          </div>
        )
      })}
      {error && <p className="text-red-600 text-xs">{error}</p>}
    </div>
  )
}
