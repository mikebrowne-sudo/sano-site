'use client'

// Week view for the contractor "To do" tab: Monday → Sunday, one calm row per
// day with a single-line summary of that day's cleans. Tap a day and it opens
// in place to show each clean (time, job, address, directions, status, and a
// way into the job). Arrows move week to week; "This week" jumps back.
//
// Shared by the live contractor page and the staff "Preview as contractor"
// tool — both pass the same rows with hrefs already built.

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { ChevronLeft, ChevronRight, ChevronDown, MapPin, Navigation, Check } from 'lucide-react'
import clsx from 'clsx'
import { contractorJobTitle } from '../_lib/job-title'

export interface WeekJob {
  id: string
  job_number: string
  title: string | null
  address: string | null
  scheduled_date: string | null
  scheduled_time: string | null
  status: string
  href: string
}

const DAY_MS = 86_400_000

function isoToUtc(iso: string): number {
  const [y, m, d] = iso.split('-').map(Number)
  return Date.UTC(y, m - 1, d)
}
function utcToIso(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10)
}
/** Monday of the week containing `iso`. */
export function mondayOf(iso: string): string {
  const ms = isoToUtc(iso)
  const dow = new Date(ms).getUTCDay() // 0 Sun … 6 Sat
  return utcToIso(ms - ((dow + 6) % 7) * DAY_MS)
}
export function weekDays(monday: string): string[] {
  const start = isoToUtc(monday)
  return Array.from({ length: 7 }, (_, i) => utcToIso(start + i * DAY_MS))
}

/** "34 Douglas Street, Ponsonby, Auckland" → "Ponsonby". */
export function suburbOf(address: string | null): string | null {
  if (!address) return null
  const parts = address.split(',').map((p) => p.trim()).filter(Boolean)
  const tail = parts.filter((p) => !/^auckland(\s+\d{4})?$/i.test(p) && !/^\d{4}$/.test(p))
  if (tail.length >= 2) return tail[1].replace(/\s+\d{4}$/, '')
  return tail[0] ?? null
}

/** Sort key for free-text times ("9:30", "1:00 pm", "13:00"). Undated last. */
function timeKey(t: string | null): number {
  if (!t) return 9_999
  const m = t.trim().toLowerCase().match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/)
  if (!m) return 9_998
  let h = Number(m[1])
  const min = Number(m[2] ?? 0)
  if (m[3] === 'pm' && h < 12) h += 12
  if (m[3] === 'am' && h === 12) h = 0
  return h * 60 + min
}

const done = (s: string) => s === 'completed' || s === 'invoiced'

export function ContractorWeekView({ jobs, todayIso }: { jobs: WeekJob[]; todayIso: string }) {
  const thisMonday = mondayOf(todayIso)
  const [monday, setMonday] = useState(thisMonday)
  const [openDay, setOpenDay] = useState<string | null>(todayIso)

  const byDay = useMemo(() => {
    const m = new Map<string, WeekJob[]>()
    for (const j of jobs) {
      if (!j.scheduled_date || j.status === 'draft') continue
      m.set(j.scheduled_date, [...(m.get(j.scheduled_date) ?? []), j])
    }
    m.forEach((list) => list.sort((a, b) => timeKey(a.scheduled_time) - timeKey(b.scheduled_time)))
    return m
  }, [jobs])

  const days = weekDays(monday)
  const weekCount = days.reduce((n, d) => n + (byDay.get(d)?.length ?? 0), 0)
  const fmtRange = () => {
    const f = (iso: string, withMonth: boolean) =>
      new Date(isoToUtc(iso)).toLocaleDateString('en-NZ', { day: 'numeric', ...(withMonth ? { month: 'short' } : {}), timeZone: 'UTC' })
    const sameMonth = days[0].slice(0, 7) === days[6].slice(0, 7)
    return `${f(days[0], !sameMonth)} – ${f(days[6], true)}`
  }
  const shift = (weeks: number) => {
    const next = utcToIso(isoToUtc(monday) + weeks * 7 * DAY_MS)
    setMonday(next)
    setOpenDay(next === thisMonday ? todayIso : null)
  }

  return (
    <div>
      {/* Week header */}
      <div className="mb-3 flex items-center justify-between gap-2">
        <button type="button" onClick={() => shift(-1)} aria-label="Previous week"
          className="flex h-9 w-9 items-center justify-center rounded-full text-sage-600 transition-colors hover:bg-white active:bg-sage-100">
          <ChevronLeft size={18} />
        </button>
        <div className="text-center">
          <p className="text-sm font-semibold tracking-tight text-sage-800">
            {monday === thisMonday ? 'This week' : fmtRange()}
          </p>
          <p className="text-[11px] text-sage-500">
            {monday === thisMonday ? fmtRange() : null}
            {monday === thisMonday ? ' · ' : ''}
            {weekCount === 0 ? 'No cleans' : `${weekCount} clean${weekCount === 1 ? '' : 's'}`}
          </p>
        </div>
        <button type="button" onClick={() => shift(1)} aria-label="Next week"
          className="flex h-9 w-9 items-center justify-center rounded-full text-sage-600 transition-colors hover:bg-white active:bg-sage-100">
          <ChevronRight size={18} />
        </button>
      </div>
      {monday !== thisMonday && (
        <div className="mb-3 flex justify-center">
          <button type="button" onClick={() => { setMonday(thisMonday); setOpenDay(todayIso) }}
            className="rounded-full bg-white px-3 py-1 text-[11px] font-medium text-sage-600 ring-1 ring-sage-100 hover:text-sage-800">
            Back to this week
          </button>
        </div>
      )}

      {/* Days */}
      <div className="overflow-hidden rounded-2xl border border-sage-100 bg-white shadow-[0_1px_2px_rgba(6,35,29,0.04)]">
        {days.map((d, idx) => {
          const list = byDay.get(d) ?? []
          const isToday = d === todayIso
          const isPast = d < todayIso
          const open = openDay === d && list.length > 0
          const date = new Date(isoToUtc(d))
          const dow = date.toLocaleDateString('en-NZ', { weekday: 'short', timeZone: 'UTC' })
          const dayNum = date.getUTCDate()
          const overdue = isPast && list.some((j) => !done(j.status))
          const allDone = list.length > 0 && list.every((j) => done(j.status))
          const summary = list
            .map((j) => [j.scheduled_time, suburbOf(j.address) ?? contractorJobTitle(j.title) ?? j.job_number].filter(Boolean).join(' '))
            .join('  ·  ')

          return (
            <div key={d} className={clsx(idx > 0 && 'border-t border-sage-100')}>
              <button
                type="button"
                onClick={() => list.length > 0 && setOpenDay(open ? null : d)}
                aria-expanded={open}
                disabled={list.length === 0}
                className={clsx(
                  'flex w-full items-center gap-3.5 px-4 py-3.5 text-left transition-colors',
                  list.length > 0 ? 'active:bg-sage-50' : 'cursor-default',
                  isToday && 'bg-emerald-50/60',
                )}
              >
                {/* Date block */}
                <div className={clsx(
                  'flex w-11 shrink-0 flex-col items-center rounded-xl py-1.5',
                  isToday ? 'bg-sage-500 text-white' : 'text-sage-700',
                )}>
                  <span className={clsx('text-[10px] font-semibold uppercase tracking-wider', isToday ? 'text-white/80' : 'text-sage-500')}>{dow}</span>
                  <span className="text-lg font-semibold leading-tight tabular-nums">{dayNum}</span>
                </div>

                {/* One-line summary */}
                <div className="min-w-0 flex-1">
                  {list.length === 0 ? (
                    <p className="text-sm text-sage-600/50">No cleans</p>
                  ) : (
                    <>
                      <p className={clsx('truncate text-sm', allDone ? 'text-sage-500' : 'font-medium text-sage-800')}>{summary}</p>
                      <p className={clsx('mt-0.5 text-[11px]', overdue ? 'font-medium text-amber-700' : 'text-sage-500')}>
                        {overdue ? 'Needs marking done'
                          : allDone ? 'All done'
                          : `${list.length} clean${list.length === 1 ? '' : 's'}`}
                      </p>
                    </>
                  )}
                </div>

                {list.length > 0 && (
                  allDone
                    ? <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-50 text-emerald-600"><Check size={14} /></span>
                    : <ChevronDown size={18} className={clsx('shrink-0 text-sage-600/50 transition-transform duration-300', open && 'rotate-180 text-sage-600')} />
                )}
              </button>

              {/* Expanded day — animates height via grid rows */}
              <div className={clsx('grid transition-[grid-template-rows] duration-300 ease-out', open ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]')}>
                <div className="overflow-hidden">
                  <div className="space-y-2.5 px-4 pb-4 pt-1">
                    {list.map((j) => {
                      const title = contractorJobTitle(j.title)
                      return (
                        <div key={j.id} className="rounded-xl border border-sage-100 bg-sage-50/60 p-3.5">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="text-sm font-semibold text-sage-800">
                                {j.scheduled_time && <span className="tabular-nums">{j.scheduled_time}</span>}
                                {j.scheduled_time && title && <span className="mx-1.5 text-sage-600/40">·</span>}
                                {title ?? j.job_number}
                              </p>
                              <p className="mt-0.5 text-[11px] uppercase tracking-wider text-sage-500">{j.job_number}</p>
                            </div>
                            <StatusPill status={j.status} overdue={isPast && !done(j.status)} />
                          </div>
                          {j.address && (
                            <p className="mt-2 flex items-start gap-1.5 text-sm leading-snug text-sage-700">
                              <MapPin size={14} className="mt-0.5 shrink-0 text-sage-400" />
                              {j.address}
                            </p>
                          )}
                          <div className="mt-3 flex gap-2">
                            <Link href={j.href}
                              className="flex-1 rounded-lg bg-sage-500 px-3 py-2 text-center text-sm font-semibold text-white transition-colors hover:bg-sage-700 active:bg-sage-800">
                              Open job
                            </Link>
                            {j.address && (
                              <a href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(j.address)}`}
                                target="_blank" rel="noopener noreferrer"
                                className="inline-flex items-center gap-1.5 rounded-lg bg-white px-3 py-2 text-sm font-medium text-sage-700 ring-1 ring-sage-100 hover:text-sage-800">
                                <Navigation size={14} /> Directions
                              </a>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function StatusPill({ status, overdue }: { status: string; overdue: boolean }) {
  const [label, cls] = overdue ? ['Mark done', 'bg-amber-50 text-amber-700 ring-amber-100']
    : status === 'completed' || status === 'invoiced' ? ['Done', 'bg-emerald-50 text-emerald-700 ring-emerald-100']
    : status === 'in_progress' ? ['In progress', 'bg-amber-50 text-amber-700 ring-amber-100']
    : ['Booked', 'bg-white text-sage-600 ring-sage-100']
  return <span className={clsx('shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-medium ring-1', cls)}>{label}</span>
}
