'use client'

// Jobs booked per month — growth over the last 12 months plus what's already
// booked ahead. One measure on one scale: bars are the booked VALUE; the job
// count is printed above each bar (the second thing Mike reads), and the
// tooltip gives jobs, value, done vs still to do, and any unpriced jobs.
// Future months are drawn lighter and labelled "booked ahead" — they only
// hold what's scheduled so far, so they're not a forecast.
// Inline SVG, sage palette, same look as GrowthChart.

import { useState } from 'react'
import type { BookedMonth } from '../_lib/dashboard-finance'

const money0 = (n: number) => new Intl.NumberFormat('en-NZ', { style: 'currency', currency: 'NZD', maximumFractionDigits: 0 }).format(n)

const BAR = '#076653'        // sage-500 — booked (past + this month)
const BAR_AHEAD = '#E0EAE3'  // sage-100 fill + sage-500 outline — booked ahead (outline keeps it legible on white)

function niceMax(v: number): number {
  if (v <= 0) return 1
  const pow = Math.pow(10, Math.floor(Math.log10(v)))
  const step = pow / 2
  return Math.ceil(v / step) * step
}

export function BookedJobsChart({ months: all }: { months: BookedMonth[] }) {
  const [hover, setHover] = useState<number | null>(null)
  // Skip empty months before the first booking (Sano started Apr 2026), but keep
  // at least six columns so a young history still reads as a trend.
  const firstBooked = all.findIndex((m) => m.jobs > 0)
  const months = all.slice(Math.max(0, Math.min(firstBooked < 0 ? 0 : firstBooked, all.length - 6)))
  if (months.length === 0 || months.every((m) => m.jobs === 0)) {
    return <div className="h-40 rounded-xl bg-sage-50/50 border border-dashed border-sage-200 grid place-items-center text-sm text-sage-500">Bookings build here as jobs are scheduled.</div>
  }

  const W = 680, H = 190, padL = 48, padR = 10, padTop = 22, padBottom = 26
  const innerW = W - padL - padR
  const innerH = H - padTop - padBottom
  const max = niceMax(Math.max(...months.map((m) => m.value), 1))
  const slot = innerW / months.length
  const barW = Math.min(30, slot * 0.6)
  const xMid = (i: number) => padL + slot * i + slot / 2
  const y = (v: number) => padTop + innerH - (v / max) * innerH
  const baseY = padTop + innerH

  const hm = hover != null ? months[hover] : null
  const tipLeft = hover != null ? Math.min(86, Math.max(14, (xMid(hover) / W) * 100)) : 0
  const hasAhead = months.some((m) => m.future && m.jobs > 0)
  const current = months.find((m) => m.current)

  return (
    <div>
      <div className="flex items-center gap-4 mb-3 text-xs">
        <span className="inline-flex items-center gap-1.5 text-sage-600"><span className="h-2.5 w-2.5 rounded-sm" style={{ background: BAR }} /> Booked value</span>
        {hasAhead && <span className="inline-flex items-center gap-1.5 text-sage-600"><span className="h-2.5 w-2.5 rounded-sm" style={{ background: BAR_AHEAD, boxShadow: 'inset 0 0 0 1px #076653' }} /> Booked ahead</span>}
        <span className="text-sage-600">Number above each bar = jobs</span>
      </div>

      <div className="relative" style={{ aspectRatio: `${W} / ${H}` }} onMouseLeave={() => setHover(null)}>
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-full overflow-visible" role="img" aria-label="Jobs booked per month: value as bars, job count above each bar">
          {[0, 0.5, 1].map((f) => {
            const yy = padTop + innerH * f
            return (
              <g key={f}>
                <line x1={padL} x2={W - padR} y1={yy} y2={yy} stroke="currentColor" strokeOpacity={f === 1 ? 0.16 : 0.07} strokeWidth="1" vectorEffect="non-scaling-stroke" className="text-sage-500" />
                <text x={padL - 6} y={yy + 3} textAnchor="end" className="fill-sage-600 tabular-nums" style={{ fontSize: 9 }}>{money0(max * (1 - f))}</text>
              </g>
            )
          })}

          {months.map((m, i) => {
            const top = y(m.value)
            const h = Math.max(0, baseY - top)
            const r = Math.min(4, h / 2)
            const x0 = xMid(i) - barW / 2
            const fill = m.future ? BAR_AHEAD : BAR
            return (
              <g key={m.month} opacity={hover == null || hover === i ? 1 : 0.55}>
                {/* bar with rounded top, square base */}
                {h > 0 && (
                  <path
                    d={`M${x0},${baseY} V${top + r} Q${x0},${top} ${x0 + r},${top} H${x0 + barW - r} Q${x0 + barW},${top} ${x0 + barW},${top + r} V${baseY} Z`}
                    fill={fill}
                    stroke={m.future ? BAR : undefined}
                    strokeWidth={m.future ? 1.25 : undefined}
                    vectorEffect="non-scaling-stroke"
                  />
                )}
                {m.jobs > 0 && (
                  <text x={xMid(i)} y={top - 5} textAnchor="middle" className="fill-sage-700 tabular-nums font-semibold" style={{ fontSize: 10 }}>{m.jobs}</text>
                )}
                <text x={xMid(i)} y={H - 8} textAnchor="middle" className={m.future ? 'fill-sage-600' : m.current ? 'fill-sage-700 font-semibold' : 'fill-sage-600'} style={{ fontSize: 10 }}>{m.label}{m.current ? '*' : ''}</text>
                {/* generous hit area */}
                <rect x={padL + slot * i} y={padTop} width={slot} height={innerH} fill="transparent" onMouseEnter={() => setHover(i)} />
              </g>
            )
          })}
        </svg>

        {hm && (
          <div className="pointer-events-none absolute -top-2 -translate-x-1/2 -translate-y-full z-10 rounded-lg bg-sage-900 px-3 py-2 text-left whitespace-nowrap shadow-lg" style={{ left: `${tipLeft}%` }}>
            <div className="text-[11px] font-semibold text-sage-200 mb-1">{hm.label} {hm.month.slice(0, 4)}{hm.current ? ' · this month' : hm.future ? ' · booked ahead' : ''}</div>
            <div className="text-xs text-white tabular-nums leading-relaxed">
              <div>{hm.jobs} job{hm.jobs === 1 ? '' : 's'} · <b>{money0(hm.value)}</b></div>
              {!hm.future && <div className="text-sage-300">{hm.done} done{hm.jobs - hm.done > 0 ? ` · ${hm.jobs - hm.done} to do` : ''}</div>}
              {hm.unpriced > 0 && <div className="text-amber-300">{hm.unpriced} without a price</div>}
            </div>
          </div>
        )}
      </div>
      <p className="text-[11px] text-sage-600 mt-1.5">
        {current && <>* {current.label} is still filling — {current.jobs} booked so far. </>}
        {hasAhead && <>Booked-ahead months show only what&apos;s scheduled so far.</>}
      </p>
    </div>
  )
}
