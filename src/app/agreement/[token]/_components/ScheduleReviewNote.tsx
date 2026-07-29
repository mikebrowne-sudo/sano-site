'use client'

import { useState, useTransition } from 'react'
import { Flag } from 'lucide-react'
import { requestAgreementScheduleCorrection } from '../_actions'
import type { AgreementScheduleBlock } from '@/lib/agreement-schedule-blocks'

/** Lets a contractor flag a schedule term that looks wrong. Records the concern
 *  for Sano — it never edits the schedule/rate and never affects signing. */
export function ScheduleReviewNote({ token, blocks }: { token: string; blocks: AgreementScheduleBlock[] }) {
  const [openFor, setOpenFor] = useState<string | null>(null)
  const [note, setNote] = useState('')
  const [doneFor, setDoneFor] = useState<Set<string>>(new Set())
  const [err, setErr] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  if (blocks.length === 0) return null

  function send(id: string, label: string) {
    setErr(null)
    startTransition(async () => {
      const res = await requestAgreementScheduleCorrection(token, id, note)
      if (res.error) { setErr(res.error); return }
      setDoneFor((prev) => new Set(prev).add(label))
      setOpenFor(null); setNote('')
    })
  }

  return (
    <div className="rounded-xl border border-sage-200 bg-white p-4 mb-6">
      <p className="text-sm font-semibold text-sage-800 mb-1">Your work arrangements</p>
      <p className="text-[13px] text-sage-500 mb-3">These are shown in full in the agreement below. If a rate or detail looks wrong, flag it and Sano will sort it before you sign — you don&rsquo;t change it here.</p>
      <ul className="space-y-2">
        {blocks.map((b) => (
          <li key={b.id} className="border border-sage-100 rounded-lg px-3 py-2">
            <div className="flex items-center justify-between gap-3">
              <span className="text-sm text-sage-700"><span className="font-medium">{b.label}</span> — {b.name}</span>
              {doneFor.has(b.label) ? (
                <span className="text-xs text-emerald-700 shrink-0">Flagged — Sano notified</span>
              ) : (
                <button type="button" onClick={() => setOpenFor(openFor === b.label ? null : b.label)} className="text-xs text-amber-700 hover:text-amber-800 inline-flex items-center gap-1 shrink-0">
                  <Flag size={12} /> Flag an issue
                </button>
              )}
            </div>
            {openFor === b.label && (
              <div className="mt-2 flex items-center gap-2">
                <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="What looks wrong?" className="rounded-lg border border-sage-200 px-3 py-1.5 text-sm w-full" />
                <button type="button" onClick={() => send(b.id, b.label)} disabled={isPending} className="text-sm bg-amber-600 text-white px-3 py-1.5 rounded-lg disabled:opacity-50 shrink-0">Send</button>
              </div>
            )}
          </li>
        ))}
      </ul>
      {err && <p className="text-xs text-red-600 mt-2">{err}</p>}
    </div>
  )
}
