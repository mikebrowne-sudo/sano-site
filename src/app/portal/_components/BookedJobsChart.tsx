'use client'

// Jobs booked per month — growth, how much of each month is already done,
// and what's booked ahead. One measure on one scale (booked $):
//   • solid gradient   = value of jobs COMPLETED / invoiced
//   • light, outlined  = booked, still to do (future months are all this)
// Job count sits in a pill above each bar. Hover a month for the breakdown —
// completed $ (and jobs), still to do, total booked. Bars grow in on load.
// Inline SVG, sage palette, same family as GrowthChart.

import { useEffect, useId, useState } from 'react'
import type { BookedMonth } from '../_lib/dashboard-finance'

const money0 = (n: number) => new Intl.NumberFormat('en-NZ', { style: 'currency', currency: 'NZD', maximumFractionDigits: 0 }).format(n)
const moneyK = (n: number) => (n >= 1000 ? `$${Math.round(n / 100) / 10}k` : money0(n))

const DONE_TOP = '#0a8a6f'    // brighter sage-green at the top of the completed fill
const DONE_BASE = '#076653'   // sage-500
const TODO_FILL = '#E0EAE3'   // sage-100
const TODO_LINE = '#076653'   // sage-500 outline keeps "to do" legible on white
const INK = '#344C3D'         // sage-700
const MUTED = '#5C6B64'       // sage-600

function niceMax(v: number): number {
  if (v <= 0) return 1
  const pow = Math.pow(10, Math.floor(Math.log10(v)))
  const step = pow / 2
  return Math.ceil(v / step) * step
}

/** Bar path with rounded top corners only. */
function topRounded(x: number, y: number, w: number, h: number, r: number): string {
  if (h <= 0) return ''
  const rr = Math.min(r, h, w / 2)
  return `M${x},${y + h} V${y + rr} Q${x},${y} ${x + rr},${y} H${x + w - rr} Q${x + w},${y} ${x + w},${y + rr} V${y + h} Z`
}

export function BookedJobsChart({ months: all }: { months: BookedMonth[] }) {
  const [hover, setHover] = useState<number | null>(null)
  const [grown, setGrown] = useState(false)
  const uid = useId().replace(/:/g, '')
  useEffect(() => { const t = requestAnimationFrame(() => setGrown(true)); return () => cancelAnimationFrame(t) }, [])

  // Skip empty months before the first booking, keeping at least six columns.
  const firstBooked = all.findIndex((m) => m.jobs > 0)
  const months = all.slice(Math.max(0, Math.min(firstBooked < 0 ? 0 : firstBooked, all.length - 6)))

  if (months.length === 0 || months.every((m) => m.jobs === 0)) {
    return <div className="h-40 rounded-xl bg-sage-50/50 border border-dashed border-sage-200 grid place-items-center text-sm text-sage-500">Bookings build here as jobs are scheduled.</div>
  }

  const W = 680, H = 210, padL = 44, padR = 8, padTop = 30, padBottom = 26
  const innerW = W - padL - padR
  const innerH = H - padTop - padBottom
  const max = niceMax(Math.max(...months.map((m) => m.value), 1))
  const slot = innerW / months.length
  const barW = Math.min(34, slot * 0.58)
  const xMid = (i: number) => padL + slot * i + slot / 2
  const hOf = (v: number) => (v / max) * innerH
  const baseY = padTop + innerH
  const GAP = 2 // surface gap between the completed and to-do segments

  const hm = hover != null ? months[hover] : null
  // Tooltip sits BESIDE the hovered bar (right of it, or left near the right
  // edge) and inside the plot, so it never covers the card header.
  const tipOnLeft = hover != null && xMid(hover) > W * 0.6
  const tipX = hover != null ? ((xMid(hover) + (tipOnLeft ? -1 : 1) * (barW / 2 + 10)) / W) * 100 : 0
  const current = months.find((m) => m.current)
  const hasAhead = months.some((m) => m.future && m.jobs > 0)

  return (
    <div>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mb-2 text-xs text-sage-600">
        <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm" style={{ background: `linear-gradient(${DONE_TOP}, ${DONE_BASE})` }} /> Completed</span>
        <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm" style={{ background: TODO_FILL, boxShadow: `inset 0 0 0 1px ${TODO_LINE}` }} /> Booked, still to do</span>
        <span className="inline-flex items-center gap-1.5"><span className="inline-grid h-4 min-w-4 place-items-center rounded-full bg-sage-800 px-1 text-[9px] font-semibold text-white">#</span> jobs</span>
      </div>

      <div className="relative" style={{ aspectRatio: `${W} / ${H}` }} onMouseLeave={() => setHover(null)}>
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-full overflow-visible" role="img" aria-label="Jobs booked per month: completed and still-to-do value, with job counts">
          <defs>
            <linearGradient id={`done-${uid}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={DONE_TOP} />
              <stop offset="100%" stopColor={DONE_BASE} />
            </linearGradient>
            <filter id={`glow-${uid}`} x="-50%" y="-20%" width="200%" height="140%">
              <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor={DONE_BASE} floodOpacity="0.28" />
            </filter>
          </defs>

          {/* recessive grid + $ axis */}
          {[0, 0.5, 1].map((f) => {
            const yy = padTop + innerH * f
            return (
              <g key={f}>
                <line x1={padL} x2={W - padR} y1={yy} y2={yy} stroke={MUTED} strokeOpacity={f === 1 ? 0.22 : 0.08} strokeDasharray={f === 1 ? undefined : '2 4'} strokeWidth="1" vectorEffect="non-scaling-stroke" />
                <text x={padL - 6} y={yy + 3} textAnchor="end" fill={MUTED} className="tabular-nums" style={{ fontSize: 9 }}>{moneyK(max * (1 - f))}</text>
              </g>
            )
          })}

          {months.map((m, i) => {
            const x0 = xMid(i) - barW / 2
            const doneH = grown ? hOf(m.future ? 0 : m.doneValue) : 0
            const totalH = grown ? hOf(m.value) : 0
            const todoH = Math.max(0, totalH - doneH - (doneH > 0 && totalH - doneH > 0 ? GAP : 0))
            const doneY = baseY - doneH
            const todoY = baseY - totalH
            const isHover = hover === i
            const dim = hover != null && !isHover
            const pillY = baseY - hOf(m.value) - 16
            return (
              <g key={m.month} style={{ opacity: dim ? 0.45 : 1, transition: 'opacity 150ms' }}>
                {/* hover column wash */}
                {isHover && <rect x={padL + slot * i + 2} y={padTop - 22} width={slot - 4} height={innerH + 22} rx="8" fill={DONE_BASE} fillOpacity="0.05" />}

                {/* booked, still to do (top segment) */}
                {todoH > 0 && (
                  <path
                    d={topRounded(x0, todoY, barW, todoH, 6)}
                    fill={TODO_FILL}
                    stroke={TODO_LINE}
                    strokeOpacity={0.55}
                    strokeWidth="1"
                    vectorEffect="non-scaling-stroke"
                    style={{ transition: 'all 700ms cubic-bezier(.2,.8,.2,1)' }}
                  />
                )}
                {/* completed (bottom segment) */}
                {doneH > 0 && (
                  <path
                    d={todoH > 0 ? `M${x0},${baseY} V${doneY} H${x0 + barW} V${baseY} Z` : topRounded(x0, doneY, barW, doneH, 6)}
                    fill={`url(#done-${uid})`}
                    filter={isHover ? `url(#glow-${uid})` : undefined}
                    style={{ transition: 'all 700ms cubic-bezier(.2,.8,.2,1)' }}
                  />
                )}

                {/* job-count pill */}
                {m.jobs > 0 && (
                  <g transform={`translate(${xMid(i)}, ${grown ? pillY : baseY - 16})`} style={{ transition: 'transform 700ms cubic-bezier(.2,.8,.2,1)' }}>
                    <rect x={-(String(m.jobs).length * 3.4 + 7)} y={-7} width={String(m.jobs).length * 6.8 + 14} height={14} rx={7} fill={m.future ? '#fff' : isHover ? DONE_BASE : '#06231D'} stroke={m.future ? TODO_LINE : 'none'} strokeOpacity={0.6} strokeWidth="1" vectorEffect="non-scaling-stroke" />
                    <text y={3.3} textAnchor="middle" fill={m.future ? INK : '#fff'} className="tabular-nums" style={{ fontSize: 9.5, fontWeight: 600 }}>{m.jobs}</text>
                  </g>
                )}

                <text x={xMid(i)} y={H - 8} textAnchor="middle" fill={m.current ? INK : MUTED} style={{ fontSize: 10, fontWeight: m.current || isHover ? 600 : 400 }}>{m.label}{m.current ? '*' : ''}</text>
                {/* generous hit area */}
                <rect x={padL + slot * i} y={padTop - 22} width={slot} height={innerH + 22} fill="transparent" onMouseEnter={() => setHover(i)} />
              </g>
            )
          })}
        </svg>

        {hm && (
          <div
            className="pointer-events-none absolute z-10 rounded-xl bg-sage-900/95 px-3.5 py-2.5 text-left whitespace-nowrap shadow-xl ring-1 ring-white/10 backdrop-blur"
            style={{ left: `${tipX}%`, top: `${(padTop / H) * 100}%`, transform: tipOnLeft ? 'translateX(-100%)' : undefined }}
          >
            <div className="text-[11px] font-semibold text-sage-200 mb-1.5">
              {hm.label} {hm.month.slice(0, 4)}
              <span className="ml-1.5 font-normal text-sage-300">{hm.current ? 'this month' : hm.future ? 'booked ahead' : ''}</span>
            </div>
            <div className="grid grid-cols-[auto_auto_auto] gap-x-3 gap-y-0.5 text-xs tabular-nums">
              {!hm.future && (
                <>
                  <span className="inline-flex items-center gap-1.5 text-sage-200"><span className="h-2 w-2 rounded-sm" style={{ background: DONE_TOP }} />Completed</span>
                  <span className="text-right font-semibold text-white">{money0(hm.doneValue)}</span>
                  <span className="text-right text-sage-300">{hm.done} job{hm.done === 1 ? '' : 's'}</span>
                </>
              )}
              {hm.value - hm.doneValue > 0.005 && (
                <>
                  <span className="inline-flex items-center gap-1.5 text-sage-200"><span className="h-2 w-2 rounded-sm" style={{ background: TODO_FILL }} />Still to do</span>
                  <span className="text-right text-white">{money0(hm.value - (hm.future ? 0 : hm.doneValue))}</span>
                  <span className="text-right text-sage-300">{hm.jobs - (hm.future ? 0 : hm.done)} job{hm.jobs - (hm.future ? 0 : hm.done) === 1 ? '' : 's'}</span>
                </>
              )}
              <span className="mt-1 border-t border-white/15 pt-1 text-sage-200">Total booked</span>
              <span className="mt-1 border-t border-white/15 pt-1 text-right font-semibold text-white">{money0(hm.value)}</span>
              <span className="mt-1 border-t border-white/15 pt-1 text-right text-sage-300">{hm.jobs} job{hm.jobs === 1 ? '' : 's'}</span>
            </div>
            {hm.unpriced > 0 && <div className="mt-1.5 text-[11px] text-amber-300">{hm.unpriced} job{hm.unpriced === 1 ? '' : 's'} without a price not included</div>}
          </div>
        )}
      </div>

      <p className="text-[11px] text-sage-600 mt-1.5">
        {current && <>* {current.label} is still filling — {current.jobs} booked so far. </>}
        {hasAhead && <>Months ahead show only what&apos;s scheduled so far.</>}
      </p>
    </div>
  )
}
