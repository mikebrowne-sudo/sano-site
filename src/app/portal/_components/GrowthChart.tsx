'use client'

// Month-on-month income vs expenses — two-line inline SVG (no chart library).
// The gap between the lines is profit. Hover snaps to a month and shows its
// income / expenses / net. Theme-aware via currentColor + sage tokens.

import { useState } from 'react'
import type { MonthPoint } from '../_lib/dashboard-finance'

const money = (n: number) => new Intl.NumberFormat('en-NZ', { style: 'currency', currency: 'NZD', maximumFractionDigits: 0 }).format(n)
const moneyFull = (n: number) => new Intl.NumberFormat('en-NZ', { style: 'currency', currency: 'NZD' }).format(n)

export function GrowthChart({ points }: { points: MonthPoint[] }) {
  const [hover, setHover] = useState<number | null>(null)

  if (points.length < 2) {
    return <div className="h-40 rounded-xl bg-sage-50/50 border border-dashed border-sage-200 grid place-items-center text-sm text-sage-500">The trend builds as months of income and expenses are recorded.</div>
  }

  const W = 640, H = 180, padX = 8, padTop = 14, padBottom = 8
  const innerW = W - padX * 2
  const innerH = H - padTop - padBottom
  const max = Math.max(...points.flatMap((p) => [p.income, p.expenses]), 1)

  const x = (i: number) => padX + (i / (points.length - 1)) * innerW
  const y = (v: number) => padTop + innerH - (v / max) * innerH
  const path = (key: 'income' | 'expenses') => points.map((p, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(p[key]).toFixed(1)}`).join(' ')

  const hp = hover != null ? points[hover] : null
  const leftPct = hover != null ? (x(hover) / W) * 100 : 0
  const tipLeft = Math.min(88, Math.max(12, leftPct))

  function onMove(e: React.MouseEvent<HTMLDivElement>) {
    const rect = e.currentTarget.getBoundingClientRect()
    const rel = (e.clientX - rect.left) / rect.width
    setHover(Math.min(points.length - 1, Math.max(0, Math.round(rel * (points.length - 1)))))
  }

  return (
    <div>
      <div className="flex items-center gap-4 mb-3 text-xs">
        <span className="inline-flex items-center gap-1.5 text-sage-600"><span className="h-2 w-4 rounded-full bg-emerald-500" /> Money in</span>
        <span className="inline-flex items-center gap-1.5 text-sage-600"><span className="h-2 w-4 rounded-full bg-rose-400" /> Money out</span>
        <span className="ml-auto text-sage-400">last {points.length} months</span>
      </div>

      <div className="relative h-40" onMouseMove={onMove} onMouseLeave={() => setHover(null)}>
        <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="w-full h-40 overflow-visible" role="img" aria-label="Monthly income versus expenses">
          <defs>
            <linearGradient id="inFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#10b981" stopOpacity="0.16" />
              <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
            </linearGradient>
          </defs>
          {[0, 0.5, 1].map((f) => (
            <line key={f} x1={padX} x2={W - padX} y1={padTop + innerH * f} y2={padTop + innerH * f} stroke="currentColor" strokeOpacity="0.08" strokeWidth="1" vectorEffect="non-scaling-stroke" className="text-sage-500" />
          ))}
          {/* income area + line (emerald), expenses line (rose) */}
          <path d={`${path('income')} L${x(points.length - 1).toFixed(1)},${padTop + innerH} L${x(0).toFixed(1)},${padTop + innerH} Z`} fill="url(#inFill)" />
          <path d={path('income')} fill="none" stroke="#10b981" strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
          <path d={path('expenses')} fill="none" stroke="#fb7185" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="1 0" vectorEffect="non-scaling-stroke" />
          {hover != null && (
            <line x1={x(hover)} x2={x(hover)} y1={padTop} y2={padTop + innerH} stroke="currentColor" strokeOpacity="0.25" strokeWidth="1" vectorEffect="non-scaling-stroke" className="text-sage-500" />
          )}
        </svg>

        {hp && (
          <>
            <span className="pointer-events-none absolute w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-white -translate-x-1/2 -translate-y-1/2" style={{ left: `${leftPct}%`, top: `${(y(hp.income) / H) * 100}%` }} />
            <span className="pointer-events-none absolute w-2.5 h-2.5 rounded-full bg-rose-400 ring-2 ring-white -translate-x-1/2 -translate-y-1/2" style={{ left: `${leftPct}%`, top: `${(y(hp.expenses) / H) * 100}%` }} />
            <div className="pointer-events-none absolute -top-2 -translate-x-1/2 -translate-y-full z-10 rounded-lg bg-sage-900 px-3 py-2 text-left whitespace-nowrap shadow-lg" style={{ left: `${tipLeft}%` }}>
              <div className="text-[11px] font-semibold text-sage-200 mb-1">{hp.label} {hp.month.slice(0, 4)}</div>
              <div className="text-xs text-white tabular-nums leading-relaxed">
                <div><span className="text-emerald-300">In</span> {moneyFull(hp.income)}</div>
                <div><span className="text-rose-300">Out</span> {moneyFull(hp.expenses)}</div>
                <div className="mt-0.5 pt-0.5 border-t border-sage-700"><span className="text-sage-300">Net</span> <b className={hp.net >= 0 ? 'text-emerald-300' : 'text-rose-300'}>{moneyFull(hp.net)}</b></div>
              </div>
            </div>
          </>
        )}
      </div>

      <div className="flex justify-between text-[11px] text-sage-400 mt-2 tabular-nums">
        <span>{points[0].label}</span>
        <span aria-hidden>·</span>
        <span>{points[points.length - 1].label}</span>
      </div>
      <p className="sr-only">Peak monthly income {money(max)}.</p>
    </div>
  )
}
