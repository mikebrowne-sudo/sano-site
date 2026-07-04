'use client'

import { useState, useTransition } from 'react'
import clsx from 'clsx'
import { setLeadStatusAction, addLeadNoteAction, setFollowUpAction } from '../_actions'
import {
  LEAD_STATUSES,
  LEAD_STATUS_LABELS,
  type LeadStatus,
} from '@/lib/campaigns/constants'

export function StatusSelect({ leadId, current }: { leadId: string; current: LeadStatus }) {
  const [isPending, startTransition] = useTransition()

  return (
    <select
      value={current}
      disabled={isPending}
      onChange={(e) => {
        const next = e.target.value as LeadStatus
        startTransition(async () => {
          await setLeadStatusAction(leadId, next)
        })
      }}
      className={clsx(
        'rounded-lg border border-sage-200 px-3 py-2 text-sm text-sage-800 bg-white focus:outline-none focus:ring-2 focus:ring-sage-500',
        isPending && 'opacity-60'
      )}
      aria-label="Lead status"
    >
      {LEAD_STATUSES.map((s) => (
        <option key={s} value={s}>{LEAD_STATUS_LABELS[s]}</option>
      ))}
    </select>
  )
}

export function FollowUpPicker({ leadId, current }: { leadId: string; current: string | null }) {
  const [isPending, startTransition] = useTransition()

  return (
    <div className="flex items-center gap-2">
      <input
        type="date"
        defaultValue={current ?? ''}
        disabled={isPending}
        onChange={(e) => {
          const v = e.target.value || null
          startTransition(async () => {
            await setFollowUpAction(leadId, v)
          })
        }}
        className={clsx(
          'rounded-lg border border-sage-200 px-3 py-2 text-sm text-sage-800 bg-white focus:outline-none focus:ring-2 focus:ring-sage-500',
          isPending && 'opacity-60'
        )}
        aria-label="Next follow-up date"
      />
    </div>
  )
}

export function AddNoteForm({ leadId }: { leadId: string }) {
  const [body, setBody] = useState('')
  const [kind, setKind] = useState<'note' | 'call' | 'email'>('note')
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function submit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (!body.trim()) return
    startTransition(async () => {
      const res = await addLeadNoteAction(leadId, kind, body)
      if (res?.error) setError(res.error)
      else setBody('')
    })
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <div className="flex items-center gap-2">
        {(['note', 'call', 'email'] as const).map((k) => (
          <button
            key={k}
            type="button"
            onClick={() => setKind(k)}
            className={clsx(
              'text-xs font-semibold rounded-full px-3 py-1.5 transition-colors',
              kind === k ? 'bg-sage-700 text-white' : 'bg-sage-50 text-sage-600 hover:bg-sage-100'
            )}
          >
            {k === 'note' ? 'Note' : k === 'call' ? 'Call' : 'Email'}
          </button>
        ))}
      </div>
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        rows={3}
        placeholder="What happened? Next step?"
        className="w-full rounded-lg border border-sage-200 px-4 py-3 text-sage-800 placeholder:text-sage-300 focus:outline-none focus:ring-2 focus:ring-sage-500 text-sm"
      />
      {error && <p className="text-red-600 text-xs">{error}</p>}
      <button
        type="submit"
        disabled={isPending || !body.trim()}
        className={clsx(
          'inline-flex items-center gap-2 bg-sage-700 text-white font-medium px-4 py-2 rounded-lg text-sm transition-colors',
          isPending || !body.trim() ? 'opacity-60 cursor-not-allowed' : 'hover:bg-sage-600'
        )}
      >
        {isPending ? 'Adding…' : 'Add to timeline'}
      </button>
    </form>
  )
}
