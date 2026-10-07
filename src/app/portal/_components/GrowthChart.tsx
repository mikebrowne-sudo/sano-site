'use client'

// Month-on-month money in vs money out, with the PROFIT told visually: the band
// between the two lines is shaded green when in profit, red when in loss — so
// "are we making money" reads at a glance, not inferred from the gap.
//
// Smooth monotone curves; a real aspect ratio (no stretch distortion); month
// labels along the axis; a peak-scale reference; and the current, still-partial
// month drawn dashed + faded so its lower figures don't read as a real dip.
// Inline SVG — no chart library. Theme-aware via sage tokens.

import { useState, useId } from 'react'
import type { MonthPoint, ProjectedMonth } from '../_lib/dashboard-finance'

const money0 = (n: number) => new Intl.NumberFormat('en-NZ', { style: 'currency', currency: 'NZD', maximumFractionDigits: 0 }).format(n)
const moneyFull = (n: number) => new Intl.NumberFormat('en-NZ', { style: 'currency', currency: 'NZD' }).format(n)

const IN = '#10b981'   // emerald — money in
const OUT = '#fb7185'  // rose — money out
const PROJ = '#0ea5e9' // sky — projected income (expected, not yet received)

/** Monotone-cubic smoothing that never overshoots past the data points (so a
 *  flat/rising series can't dip below zero on the curve). Returns an SVG path. */
function smoothPath(pts: { x: number; y: number }[]): string {
  if (pts.length < 2) return pts.length ? `M${pts[0].x},${pts[0].y}` : ''
  let d = `M${pts[0].x.toFixed(1)},${pts[0].y.toFixed(1)}`
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] ?? pts[i]
    const p1 = pts[i]
    const p2 = pts[i + 1]
    const p3 = pts[i + 2] ?? p2
    const c1x = p1.x + (p2.x - p0.x) / 6
    const c1y = p1.y + (p2.y - p0.y) / 6
    const c2x = p2.x - (p3.x - p1.x) / 6
    const c2y = p2.y - (p3.y - p1.y) / 6
    d += ` C${c1x.toFixed(1)},${c1y.toFixed(1)} ${c2x.toFixed(1)},${c2y.toFixed(1)} ${p2.x.toFixed(1)},${p2.y.toFixed(1)}`
  }
  return d
}

export function GrowthChart({ points, projection = [] }: { points: MonthPoint[]; projection?: ProjectedMonth[] }) {
  const [hover, setHover] = useState<number | null>(null)
  const uid = useId().replace(/:/g, '')

  if (points.length < 2) {
    return <div className="h-44 rounded-xl bg-sage-50/50 border border-dashed border-sage-200 grid place-items-center text-sm text-sage-500">The trend builds as months of income and expenses are recorded.</div>
  }

  // The projection's first entry is the current month (shared with history); the
  // rest are future months that extend the x-axis. Drop the shared first one.
  const futureProj = projection.slice(1)
  const totalCols = points.length + futureProj.length

  // Real aspect ratio — the SVG keeps its shape (preserveAspectRatio default).
  // padL is roomy so the left-hand dollar axis labels have space.
  const W = 680, H = 200, padL = 48, padR = 10, padTop = 16, padBottom = 26
  const innerW = W - padL - padR
  const innerH = H - padTop - padBottom
  const rawMax = Math.max(
    ...points.flatMap((p) => [p.income, p.expenses]),
    ...projection.map((p) => p.projected),
    1,
  )
  // Round the scale up to a clean number so the axis reads $0 / $10k / $20k etc.
  function niceMax(v: number): number {
    if (v <= 0) return 1
    const pow = Math.pow(10, Math.floor(Math.log10(v)))
    const step = pow / 2 // e.g. 5000 steps for tens-of-thousands
    return Math.ceil(v / step) * step
  }
  const max = niceMax(rawMax)

  const x = (i: number) => padL + (i / (totalCols - 1)) * innerW
  const y = (v: number) => padTop + innerH - (v / max) * innerH
  const baseY = padTop + innerH

  const inPts = points.map((p, i) => ({ x: x(i), y: y(p.income) }))
  const outPts = points.map((p, i) => ({ x: x(i), y: y(p.expenses) }))
  const inPath = smoothPath(inPts)

  // Profit band = the area between the income (top) and expenses (bottom) curves:
  // forward along income, then back along expenses.
  const bandPath = `${inPath} L${outPts[outPts.length - 1].x.toFixed(1)},${outPts[outPts.length - 1].y.toFixed(1)} ` +
    smoothPath([...outPts].reverse()).replace(/^M[^C]*/, '') + ' Z'

  // Split the last (partial) segment so it renders dashed + faded. `solidTo` is
  // the last index drawn solid; the partial month adds a dashed tail from there.
  const lastIdx = points.length - 1
  const isPartial = !!points[lastIdx]?.partial
  const solidTo = isPartial ? lastIdx - 1 : lastIdx
  const solidInPts = inPts.slice(0, solidTo + 1)
  const solidOutPts = outPts.slice(0, solidTo + 1)

  // Projected income line: starts at the last historical income point (so it
  // joins the solid history), then extends through the future projected months.
  const projPts = futureProj.length
    ? [
        { x: x(lastIdx), y: y(points[lastIdx].income) },
        ...futureProj.map((p, k) => ({ x: x(points.length + k), y: y(p.projected) })),
      ]
    : []

  const hp = hover != null ? points[hover] : null
  const leftPct = hover != null ? (x(hover) / W) * 100 : 0
  const tipLeft = Math.min(86, Math.max(14, leftPct))
  // Show every month label.
  const labelStep = 1

  function onMove(e: React.MouseEvent<HTMLDivElement>) {
    const rect = e.currentTarget.getBoundingClientRect()
    // Map the cursor into the plotted area (which starts at padL, not 0) across
    // ALL columns (history + projection), then snap to the nearest column and
    // clamp to a real history point (only history months have a tooltip).
    const relX = ((e.clientX - rect.left) / rect.width) * W
    const frac = (relX - padL) / innerW
    const col = Math.round(frac * (totalCols - 1))
    setHover(Math.min(points.length - 1, Math.max(0, col)))
  }

  return (
    <div>
      <div className="flex items-center gap-4 mb-3 text-xs">
        <span className="inline-flex items-center gap-1.5 text-sage-600"><span className="h-2.5 w-2.5 rounded-full" style={{ background: IN }} /> Money in</span>
        <span className="inline-flex items-center gap-1.5 text-sage-600"><span className="h-2.5 w-2.5 rounded-full" style={{ background: OUT }} /> Money out</span>
        <span className="inline-flex items-center gap-1.5 text-sage-500"><span className="h-2.5 w-2.5 rounded-sm bg-emerald-500/20 ring-1 ring-emerald-500/40" /> Profit</span>
        {futureProj.length > 0 && (
          <span className="inline-flex items-center gap-1.5 text-sage-600"><span className="h-2.5 w-2.5 rounded-full" style={{ background: PROJ }} /> Projected in</span>
        )}
      </div>

      <div className="relative" style={{ aspectRatio: `${W} / ${H}` }} onMouseMove={onMove} onMouseLeave={() => setHover(null)}>
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-full overflow-visible" role="img" aria-label="Monthly money in versus money out, with profit shaded">
          <defs>
            {/* profit band: green where income ≥ expenses, red where below */}
            <linearGradient id={`prof-${uid}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={IN} stopOpacity="0.20" />
              <stop offset="100%" stopColor={IN} stopOpacity="0.03" />
            </linearGradient>
          </defs>

          {/* gridlines + left-hand dollar axis. f=0 is the top (max), f=1 the base ($0). */}
          {[0, 0.25, 0.5, 0.75, 1].map((f) => {
            const yy = padTop + innerH * f
            const val = max * (1 - f) // top line = max, bottom = 0
            return (
              <g key={f}>
                <line x1={padL} x2={W - padR} y1={yy} y2={yy} stroke="currentColor" strokeOpacity={f === 1 ? 0.16 : 0.07} strokeWidth="1" vectorEffect="non-scaling-stroke" className="text-sage-500" />
                <text x={padL - 6} y={yy + 3} textAnchor="end" className="fill-sage-400 tabular-nums" style={{ fontSize: 9 }}>{money0(val)}</text>
              </g>
            )
          })}

          {/* profit band — the area between the income (top) and expenses (bottom) curves */}
          <path d={bandPath} fill={`url(#prof-${uid})`} />

          {/* solid part of each line (up to the last complete month) */}
          <path d={smoothPath(solidOutPts)} fill="none" stroke={OUT} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
          <path d={smoothPath(solidInPts)} fill="none" stroke={IN} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />

          {/* dashed + faded final segment for the in-progress month */}
          {isPartial && solidTo >= 0 && (
            <>
              <path d={smoothPath(outPts.slice(solidTo))} fill="none" stroke={OUT} strokeOpacity="0.5" strokeWidth="2" strokeDasharray="4 3" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
              <path d={smoothPath(inPts.slice(solidTo))} fill="none" stroke={IN} strokeOpacity="0.5" strokeWidth="2.5" strokeDasharray="4 3" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
            </>
          )}

          {/* projected income — dashed sky line extending past "now" */}
          {projPts.length > 1 && (
            <>
              <path d={smoothPath(projPts)} fill="none" stroke={PROJ} strokeWidth="2.5" strokeDasharray="5 4" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
              {futureProj.map((p, k) => (
                <circle key={k} cx={x(points.length + k)} cy={y(p.projected)} r="2.5" fill={PROJ} />
              ))}
            </>
          )}

          {/* month ticks (history + future projected months) */}
          {points.map((p, i) => (i % labelStep === 0 || i === lastIdx) && (
            <text key={i} x={x(i)} y={H - 8} textAnchor="middle" className="fill-sage-400" style={{ fontSize: 10 }}>{p.label}{p.partial ? '*' : ''}</text>
          ))}
          {futureProj.map((p, k) => (
            <text key={`fp-${k}`} x={x(points.length + k)} y={H - 8} textAnchor="middle" className="fill-sky-500" style={{ fontSize: 10 }}>{p.label}</text>
          ))}

          {hover != null && (
            <line x1={x(hover)} x2={x(hover)} y1={padTop} y2={baseY} stroke="currentColor" strokeOpacity="0.25" strokeWidth="1" vectorEffect="non-scaling-stroke" className="text-sage-500" />
          )}
        </svg>

        {hp && (
          <>
            <span className="pointer-events-none absolute w-2.5 h-2.5 rounded-full ring-2 ring-white -translate-x-1/2 -translate-y-1/2" style={{ background: IN, left: `${leftPct}%`, top: `${(y(hp.income) / H) * 100}%` }} />
            <span className="pointer-events-none absolute w-2.5 h-2.5 rounded-full ring-2 ring-white -translate-x-1/2 -translate-y-1/2" style={{ background: OUT, left: `${leftPct}%`, top: `${(y(hp.expenses) / H) * 100}%` }} />
            <div className="pointer-events-none absolute -top-2 -translate-x-1/2 -translate-y-full z-10 rounded-lg bg-sage-900 px-3 py-2 text-left whitespace-nowrap shadow-lg" style={{ left: `${tipLeft}%` }}>
              <div className="text-[11px] font-semibold text-sage-200 mb-1">{hp.label} {hp.month.slice(0, 4)}{hp.partial ? ' · so far' : ''}</div>
              <div className="text-xs text-white tabular-nums leading-relaxed">
                <div><span className="text-emerald-300">In</span> {moneyFull(hp.income)}</div>
                <div><span className="text-rose-300">Out</span> {moneyFull(hp.expenses)}</div>
                <div className="mt-0.5 pt-0.5 border-t border-sage-700"><span className="text-sage-300">Net</span> <b className={hp.net >= 0 ? 'text-emerald-300' : 'text-rose-300'}>{moneyFull(hp.net)}</b></div>
              </div>
            </div>
          </>
        )}
      </div>

      {points[lastIdx]?.partial && (
        <p className="text-[11px] text-sage-400 mt-1.5">* {points[lastIdx].label} is still in progress — figures build through the month.</p>
      )}
    </div>
  )
}
