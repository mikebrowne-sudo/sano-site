'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import clsx from 'clsx'
import { Pencil } from 'lucide-react'
import { updateCampaignScheduleAction } from '../_actions'

const WEEKDAYS = [
  { d: 1, label: 'Mon' }, { d: 2, label: 'Tue' }, { d: 3, label: 'Wed' },
  { d: 4, label: 'Thu' }, { d: 5, label: 'Fri' }, { d: 6, label: 'Sat' }, { d: 7, label: 'Sun' },
]

/** Edit a campaign's schedule after creation (name, start date, send time, days,
 *  cap). The recipient list is locked and never changes here. */
export function EditScheduleCard({
  campaignId,
  status,
  initial,
}: {
  campaignId: string
  status: string
  initial: { name: string; startDate: string | null; sendTimeNz: string; sendingDays: number[]; dailyCap: number }
}) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [name, setName] = useState(initial.name)
  const [startDate, setStartDate] = useState(initial.startDate ?? '')
  const [sendTimeNz, setSendTimeNz] = useState(initial.sendTimeNz)
  const [days, setDays] = useState<Set<number>>(new Set(initial.sendingDays))
  const [dailyCap, setDailyCap] = useState(String(initial.dailyCap))
  const [allowUnlimited, setAllowUnlimited] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  if (status === 'sent') return null

  const capNum = Number(dailyCap)
  const capOverWarn = capNum > 20
  const capIsZero = !(capNum > 0)

  function save() {
    setError(null); setSaved(false)
    if (days.size === 0) { setError('Pick at least one sending day.'); return }
    if (capIsZero && !allowUnlimited) { setError('A daily cap of 0 sends everything at once — tick to confirm.'); return }
    startTransition(async () => {
      const res = await updateCampaignScheduleAction({
        campaignId,
        name,
        startDate: startDate || null,
        sendTimeNz,
        sendingDays: Array.from(days).sort(),
        dailySendCap: capIsZero ? 0 : capNum,
        allowUnlimited: capIsZero ? allowUnlimited : undefined,
      })
      if (res?.error) setError(res.error)
      else { setSaved(true); setOpen(false); router.refresh() }
    })
  }

  if (!open) {
    return (
      <div className="mb-6">
        <button
          type="button"
          onClick={() => { setOpen(true); setSaved(false) }}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-sage-600 hover:text-sage-900"
        >
          <Pencil size={14} /> Edit schedule
        </button>
        {saved && <span className="ml-3 text-[12px] text-emerald-700">Saved.</span>}
      </div>
    )
  }

  return (
    <div className="mb-6 rounded-xl border border-sage-200 bg-white p-5 space-y-4">
      <h3 className="text-sm font-semibold text-sage-800">Edit schedule</h3>
      <label className="block">
        <span className="block text-sm font-semibold text-sage-800 mb-1.5">Name</span>
        <input value={name} onChange={(e) => setName(e.target.value)} className="w-full rounded-lg border border-sage-200 px-3 py-2 text-sage-800 text-sm focus:outline-none focus:ring-2 focus:ring-sage-500" />
      </label>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <label className="block">
          <span className="block text-sm font-semibold text-sage-800 mb-1.5">Start date</span>
          <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-full rounded-lg border border-sage-200 px-3 py-2 text-sage-800 text-sm focus:outline-none focus:ring-2 focus:ring-sage-500" />
        </label>
        <label className="block">
          <span className="block text-sm font-semibold text-sage-800 mb-1.5">Send time (NZ)</span>
          <input type="time" value={sendTimeNz} onChange={(e) => setSendTimeNz(e.target.value)} className="w-full rounded-lg border border-sage-200 px-3 py-2 text-sage-800 text-sm focus:outline-none focus:ring-2 focus:ring-sage-500" />
          <span className="block text-[11px] text-sage-500 mt-1">The drip checks hourly and sends the day’s batch once this time has passed.</span>
        </label>
      </div>
      <div>
        <span className="block text-sm font-semibold text-sage-800 mb-1.5">Sending days</span>
        <div className="flex flex-wrap gap-2">
          {WEEKDAYS.map(({ d, label }) => {
            const on = days.has(d)
            return (
              <button type="button" key={d}
                onClick={() => setDays((prev) => { const n = new Set(prev); if (n.has(d)) n.delete(d); else n.add(d); return n })}
                className={clsx('px-3 py-1.5 rounded-md text-sm font-medium border', on ? 'bg-sage-600 text-white border-sage-600' : 'bg-white text-sage-600 border-sage-200 hover:border-sage-300')}
              >{label}</button>
            )
          })}
        </div>
      </div>
      <div>
        <span className="block text-sm font-semibold text-sage-800 mb-1.5">Daily cap</span>
        <div className="flex items-center gap-2">
          <input type="number" min="1" value={dailyCap} onChange={(e) => setDailyCap(e.target.value)} className="w-24 rounded-lg border border-sage-200 px-3 py-2 text-sage-800 text-sm focus:outline-none focus:ring-2 focus:ring-sage-500" />
          <span className="text-sm text-sage-600">emails per day</span>
        </div>
        {capOverWarn && <p className="mt-2 text-[12px] text-amber-700 bg-amber-50 border border-amber-200 rounded-md px-3 py-2">⚠️ Above 20/day risks spam-foldering from a fresh sender.</p>}
        {capIsZero && (
          <label className="mt-2 flex items-start gap-2 text-[12px] text-red-700 bg-red-50 border border-red-200 rounded-md px-3 py-2 cursor-pointer">
            <input type="checkbox" checked={allowUnlimited} onChange={(e) => setAllowUnlimited(e.target.checked)} className="mt-0.5" />
            <span><strong>Send everything at once (no cap).</strong> Tick to confirm.</span>
          </label>
        )}
      </div>
      {error && <p className="text-[12px] text-red-600">{error}</p>}
      <div className="flex items-center gap-3">
        <button type="button" disabled={isPending} onClick={save} className={clsx('bg-sage-700 hover:bg-sage-600 text-white font-medium px-4 py-2 rounded-lg text-sm', isPending && 'opacity-60')}>
          {isPending ? 'Saving…' : 'Save changes'}
        </button>
        <button type="button" onClick={() => setOpen(false)} className="text-sm text-sage-600 hover:text-sage-800">Cancel</button>
      </div>
    </div>
  )
}
