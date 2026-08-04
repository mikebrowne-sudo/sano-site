'use client'

// One-click "Pay this week" for a weekly employee. Creates the current advance
// week's draft (dates pre-filled, mileage auto-pulled) and lands on the review
// page — where staff check the numbers, Approve, then Mark paid. The review gate
// is deliberately kept (payroll should never auto-approve).

import { useTransition } from 'react'
import { ArrowRight, CalendarClock } from 'lucide-react'
import { createPayRun } from '../_actions'

function advanceWeek(ref: Date): { start: string; end: string; payDate: string } {
  const dow = ref.getDay()
  const monday = new Date(ref)
  monday.setDate(ref.getDate() - ((dow + 6) % 7))
  const sunday = new Date(monday)
  sunday.setDate(monday.getDate() + 6)
  const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  return { start: iso(monday), end: iso(sunday), payDate: iso(monday) }
}

const fmt = (iso: string) => new Date(iso + 'T00:00:00').toLocaleDateString('en-NZ', { day: 'numeric', month: 'short' })

export function QuickPayWeek({
  frequency,
  employeeNames,
  lastPaidDate,
}: {
  frequency: 'weekly' | 'fortnightly'
  employeeNames: string[]
  lastPaidDate: string | null
}) {
  const [isPending, startTransition] = useTransition()
  const wk = advanceWeek(new Date())

  function pay() {
    startTransition(async () => {
      // createPayRun redirects to the review page on success.
      const res = await createPayRun({ pay_period_start: wk.start, pay_period_end: wk.end, pay_date: wk.payDate, pay_frequency: frequency })
      // Only reached if it returned an error (e.g. a run already exists this week).
      if (res?.error) alert(res.error)
    })
  }

  const label = frequency === 'weekly' ? 'this week' : 'this fortnight'

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 max-w-xl">
      <div className="flex items-center justify-between gap-4">
        <div>
          <div className="text-sage-800 font-semibold text-sm">
            Pay {employeeNames.length === 1 ? employeeNames[0] : `${employeeNames.length} ${frequency} employees`} {label}
          </div>
          <div className="text-xs text-sage-500 mt-1 flex items-center gap-1.5">
            <CalendarClock size={12} className="text-sage-400" />
            {fmt(wk.start)} – {fmt(wk.end)}
            {lastPaidDate && <span className="text-sage-400">· last paid {new Date(lastPaidDate).toLocaleDateString('en-NZ', { day: 'numeric', month: 'short' })}</span>}
          </div>
        </div>
        <button
          type="button"
          onClick={pay}
          disabled={isPending}
          className="inline-flex items-center gap-2 bg-sage-500 text-white font-semibold px-4 py-2.5 rounded-lg text-sm hover:bg-sage-700 transition-colors disabled:opacity-50 shrink-0"
        >
          {isPending ? 'Creating…' : <>Pay {label} <ArrowRight size={14} /></>}
        </button>
      </div>
      <p className="text-[11px] text-sage-400 mt-2">Creates this period&rsquo;s draft (with any approved mileage) → review the figures → approve → mark paid.</p>
    </div>
  )
}
