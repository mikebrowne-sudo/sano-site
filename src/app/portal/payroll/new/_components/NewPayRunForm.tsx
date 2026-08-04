'use client'

import { useEffect, useMemo, useState, useTransition } from 'react'
import Link from 'next/link'
import clsx from 'clsx'
import { ArrowRight, UserRound, Users, Info } from 'lucide-react'
import { createPayRun, previewPeriodMileage } from '../../_actions'

export interface PayrollEmployee {
  id: string
  name: string
  payFrequency: 'weekly' | 'fortnightly' | null
  hourlyRate: number | null
  standardHours: number | null
}

const money = (n: number) => new Intl.NumberFormat('en-NZ', { style: 'currency', currency: 'NZD' }).format(n)

// Advance weekly period from a reference date: Monday (payday) → following Sunday.
function advanceWeek(ref: Date): { start: string; end: string; payDate: string } {
  const dow = ref.getDay()
  const mondayOffset = (dow + 6) % 7
  const monday = new Date(ref)
  monday.setDate(ref.getDate() - mondayOffset)
  const sunday = new Date(monday)
  sunday.setDate(monday.getDate() + 6)
  const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  return { start: iso(monday), end: iso(sunday), payDate: iso(monday) }
}

export function NewPayRunForm({ employees }: { employees: PayrollEmployee[] }) {
  const [frequency, setFrequency] = useState<'weekly' | 'fortnightly'>('weekly')
  const [mileageOnly, setMileageOnly] = useState(false)
  const initial = advanceWeek(new Date())
  const [start, setStart] = useState(initial.start)
  const [end, setEnd] = useState(initial.end)
  const [payDate, setPayDate] = useState(initial.payDate)
  const [notes, setNotes] = useState('')
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  // Who this run will actually pay: active employees on the chosen cycle.
  const included = useMemo(
    () => employees.filter((e) => e.payFrequency === frequency),
    [employees, frequency],
  )

  // Live mileage preview for the chosen period (mileage-catch-up mode) — shows
  // what will actually be paid before creating, so the dates are obviously right.
  const [mileagePreview, setMileagePreview] = useState<{ total: number; count: number } | null>(null)
  useEffect(() => {
    if (!mileageOnly || !start || !end) { setMileagePreview(null); return }
    let cancelled = false
    previewPeriodMileage({ from: start, to: end }).then((r) => {
      if (!cancelled && !r.error) setMileagePreview({ total: r.total, count: r.count })
    })
    return () => { cancelled = true }
  }, [mileageOnly, start, end])

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    startTransition(async () => {
      const result = await createPayRun({ pay_period_start: start, pay_period_end: end, pay_date: payDate, pay_frequency: frequency, notes: notes.trim() || undefined, mileage_only: mileageOnly })
      if (result?.error) setError(result.error)
    })
  }

  const inputCls = 'w-full rounded-lg border border-sage-200 px-4 py-3 text-sage-800 text-sm focus:outline-none focus:ring-2 focus:ring-sage-500'

  return (
    <form onSubmit={handleSubmit} className="max-w-lg space-y-6">
      <label className="block">
        <span className="block text-sm font-semibold text-sage-800 mb-1.5">Pay cycle</span>
        <select value={frequency} onChange={(e) => setFrequency(e.target.value as 'weekly' | 'fortnightly')} className={inputCls}>
          <option value="weekly">Weekly</option>
          <option value="fortnightly">Fortnightly</option>
        </select>
      </label>

      {/* Mileage catch-up: release mileage that predates the normal cycle,
          without paying wages. Zero wages/PAYE — just the period's reimbursement. */}
      <label className="flex items-start gap-2.5 rounded-lg border border-sage-200 px-3 py-2.5 cursor-pointer">
        <input type="checkbox" checked={mileageOnly} onChange={(e) => setMileageOnly(e.target.checked)} className="mt-0.5" />
        <span className="text-sm">
          <span className="font-medium text-sage-800">Mileage catch-up (no wages)</span>
          <span className="block text-[12px] text-sage-500">Pay only this period&rsquo;s approved mileage — 0 hours, no PAYE. Use for a one-off catch-up of older mileage; set the period to cover those dates.</span>
        </span>
      </label>

      {/* Who's in this run — the employees on the chosen cycle. Makes it obvious
          who gets paid (previously invisible), and that contractors are elsewhere. */}
      <div className="rounded-xl border border-sage-200 bg-sage-50/50 p-4">
        <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-sage-500 mb-2">
          <Users size={13} /> {mileageOnly ? `Mileage catch-up — ${frequency} employees` : `Employees in this ${frequency} run`}
        </div>
        {included.length === 0 ? (
          <p className="text-sm text-sage-500">No active employees on the {frequency} cycle.</p>
        ) : (
          <ul className="space-y-1.5">
            {included.map((e) => {
              const gross = (e.hourlyRate ?? 0) * (e.standardHours ?? 0)
              return (
                <li key={e.id} className="flex items-center justify-between text-sm">
                  <span className="inline-flex items-center gap-2 text-sage-800 font-medium">
                    <UserRound size={14} className="text-sage-400" /> {e.name}
                  </span>
                  <span className="text-sage-500 tabular-nums">
                    {mileageOnly ? 'mileage in period only' : <>{e.standardHours ?? 0}h × {money(e.hourlyRate ?? 0)}{gross > 0 ? ` = ${money(gross)}` : ''}</>}
                  </span>
                </li>
              )
            })}
          </ul>
        )}
        <p className="mt-3 text-[12px] text-sage-500 leading-snug">
          {mileageOnly
            ? 'No wages or PAYE — this run pays only the approved mileage dated within the period below. Set the period to cover the mileage you’re catching up.'
            : 'All active employees on this cycle are paid together. Approved mileage for the period is added automatically as a non-taxable reimbursement.'}
        </p>
        {mileageOnly && mileagePreview && (
          <p className={clsx('mt-2 text-sm font-medium tabular-nums', mileagePreview.total > 0 ? 'text-emerald-700' : 'text-amber-700')}>
            {mileagePreview.total > 0
              ? `This period will pay ${money(mileagePreview.total)} of mileage (${mileagePreview.count} log${mileagePreview.count === 1 ? '' : 's'}).`
              : 'No approved, unpaid mileage in this period — adjust the dates to cover the mileage you’re catching up.'}
          </p>
        )}
      </div>

      {/* Subcontractors are NOT paid here — separate flow. */}
      <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-4 flex items-start gap-2.5">
        <Info size={15} className="text-amber-600 mt-0.5 shrink-0" />
        <div className="text-[13px] text-amber-800">
          <span className="font-semibold">Paying a subcontractor?</span> Contractors aren&rsquo;t paid on this screen — they&rsquo;re paid from their approved jobs.
          <Link href="/portal/contractor-invoices/pay-run" className="inline-flex items-center gap-1 font-medium underline ml-1">
            Go to Contractor pay <ArrowRight size={11} />
          </Link>
        </div>
      </div>

      <p className="text-xs text-sage-500 bg-sage-50 border border-sage-100 rounded-lg px-3 py-2">Pre-filled to the current <strong>advance</strong> week (Mon–Sun, paid on the Monday). Adjust if needed.</p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <label className="block">
          <span className="block text-sm font-semibold text-sage-800 mb-1.5">Period start</span>
          <input type="date" value={start} onChange={(e) => setStart(e.target.value)} required className={inputCls} />
        </label>
        <label className="block">
          <span className="block text-sm font-semibold text-sage-800 mb-1.5">Period end</span>
          <input type="date" value={end} onChange={(e) => setEnd(e.target.value)} required className={inputCls} />
        </label>
      </div>
      <label className="block">
        <span className="block text-sm font-semibold text-sage-800 mb-1.5">Pay date</span>
        <input type="date" value={payDate} onChange={(e) => setPayDate(e.target.value)} required className={inputCls} />
      </label>
      <label className="block">
        <span className="block text-sm font-semibold text-sage-800 mb-1.5">Notes</span>
        <textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} className={`${inputCls} resize-y`} />
      </label>

      {error && <p className="text-red-600 text-sm bg-red-50 rounded-lg px-4 py-3">{error}</p>}
      <button type="submit" disabled={isPending || included.length === 0} className="bg-sage-500 text-white font-semibold px-6 py-3 rounded-lg hover:bg-sage-700 transition-colors disabled:opacity-50">
        {isPending
          ? 'Creating…'
          : mileageOnly
            ? `Create mileage catch-up${included.length === 1 ? ` for ${included[0].name}` : ` (${included.length} employees)`}`
            : included.length === 1 ? `Create pay run for ${included[0].name}` : `Create pay run (${included.length} employees)`}
      </button>
    </form>
  )
}
