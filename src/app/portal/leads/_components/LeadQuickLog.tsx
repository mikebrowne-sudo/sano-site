'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import clsx from 'clsx'
import { quickLogAction } from '../_actions'
import { LEAD_STATUSES, LEAD_STATUS_LABELS, type LeadStatus } from '@/lib/campaigns/constants'

/**
 * One-box "log feedback / next step" for a lead. Note + status + follow-up date
 * + renewal date, saved together. Writes to the single sales_leads row, so it
 * shows up on the lead page, the campaign recipient view, and the Alerts page.
 * Shared by both the lead detail page and (compact) the campaign recipients.
 */
export function LeadQuickLog({
  leadId,
  currentStatus,
  currentFollowUp,
  currentRenewal,
  fromCampaignId,
  compact = false,
}: {
  leadId: string
  currentStatus?: string | null
  currentFollowUp?: string | null
  currentRenewal?: string | null
  fromCampaignId?: string
  compact?: boolean
}) {
  const router = useRouter()
  const [note, setNote] = useState('')
  const [status, setStatus] = useState<string>(currentStatus ?? 'new')
  const [followUp, setFollowUp] = useState(currentFollowUp ?? '')
  const [renewal, setRenewal] = useState(currentRenewal ?? '')
  const [isPending, startTransition] = useTransition()
  const [msg, setMsg] = useState<string | null>(null)

  function save() {
    setMsg(null)
    startTransition(async () => {
      const res = await quickLogAction({
        leadId,
        note: note.trim() || undefined,
        status: status !== currentStatus ? status : undefined,
        followUp: followUp !== (currentFollowUp ?? '') ? (followUp || null) : undefined,
        renewalDate: renewal !== (currentRenewal ?? '') ? (renewal || null) : undefined,
        fromCampaignId,
      })
      if (res?.error) setMsg(res.error)
      else { setNote(''); setMsg('Saved.'); router.refresh() }
    })
  }

  return (
    <div className={clsx('rounded-xl border border-sage-200 bg-white', compact ? 'p-3' : 'p-5')}>
      {!compact && <h3 className="text-sm font-semibold text-sage-800 mb-3">Log feedback / next step</h3>}
      <textarea
        value={note} onChange={(e) => setNote(e.target.value)}
        rows={compact ? 2 : 3}
        placeholder="Add a note — e.g. 'Spoke to Jane, interested, wants a quote in Feb'"
        className="w-full rounded-lg border border-sage-200 px-3 py-2 text-sm text-sage-800 placeholder:text-sage-300 focus:outline-none focus:ring-2 focus:ring-sage-500 resize-y"
      />
      <div className={clsx('mt-3 grid gap-3', compact ? 'grid-cols-1' : 'grid-cols-1 sm:grid-cols-3')}>
        <label className="block">
          <span className="block text-[11px] font-semibold uppercase tracking-wide text-sage-500 mb-1">Status</span>
          <select value={status} onChange={(e) => setStatus(e.target.value)} className="w-full rounded-lg border border-sage-200 px-2.5 py-2 text-sm text-sage-800 focus:outline-none focus:ring-2 focus:ring-sage-500">
            {LEAD_STATUSES.map((s) => <option key={s} value={s}>{LEAD_STATUS_LABELS[s as LeadStatus]}</option>)}
          </select>
        </label>
        <label className="block">
          <span className="block text-[11px] font-semibold uppercase tracking-wide text-sage-500 mb-1">Follow up</span>
          <input type="date" value={followUp} onChange={(e) => setFollowUp(e.target.value)} className="w-full rounded-lg border border-sage-200 px-2.5 py-2 text-sm text-sage-800 focus:outline-none focus:ring-2 focus:ring-sage-500" />
        </label>
        <label className="block">
          <span className="block text-[11px] font-semibold uppercase tracking-wide text-sage-500 mb-1">Renewal / review</span>
          <input type="date" value={renewal} onChange={(e) => setRenewal(e.target.value)} className="w-full rounded-lg border border-sage-200 px-2.5 py-2 text-sm text-sage-800 focus:outline-none focus:ring-2 focus:ring-sage-500" />
        </label>
      </div>
      <div className="mt-3 flex items-center gap-3">
        <button type="button" disabled={isPending} onClick={save} className={clsx('bg-sage-700 hover:bg-sage-600 text-white font-medium px-4 py-2 rounded-lg text-sm', isPending && 'opacity-60')}>
          {isPending ? 'Saving…' : 'Save'}
        </button>
        {msg && <span className={clsx('text-[12px]', msg === 'Saved.' ? 'text-emerald-700' : 'text-red-600')}>{msg}</span>}
      </div>
    </div>
  )
}
