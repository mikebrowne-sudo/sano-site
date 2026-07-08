'use client'

// Visitor trend line/area chart with a hover tooltip. Hovering anywhere over
// the chart snaps to the nearest day and shows that day's date + visitor count,
// with a guide line and a dot. Overlays are HTML (percentage-positioned) so
// they don't distort under the stretched SVG viewBox.

import { useState } from 'react'
import { TrendingUp } from 'lucide-react'
import type { TrendPoint } from '@/lib/ga4'

const nf = new Intl.NumberFormat('en-NZ')
const fmtDay = (iso: string) => new Date(iso).toLocaleDateString('en-NZ', { day: 'numeric', month: 'short' })
const fmtFull = (iso: string) => new Date(iso).toLocaleDateString('en-NZ', { weekday: 'short', day: 'numeric', month: 'short' })

export function TrendChart({ points }: { points: TrendPoint[] }) {
  const [hover, setHover] = useState<number | null>(null)

  if (points.length < 3) {
    return (
      <div className="flex flex-col items-center justify-center text-center h-32 rounded-xl bg-sage-50/50 border border-dashed border-sage-200">
        <TrendingUp size={20} className="text-sage-300 mb-2" />
        <p className="text-sm text-sage-500">Trend will become clearer as more data collects.</p>
        {points.length > 0 && <p className="text-xs text-sage-400 mt-1">{nf.format(points.reduce((s, p) => s + p.value, 0))} visitors so far</p>}
      </div>
    )
  }

  const W = 600, H = 150, padX = 6, padTop = 12, padBottom = 6
  const innerW = W - padX * 2
  const innerH = H - padTop - padBottom
  const vals = points.map((p) => p.value)
  const max = Math.max(...vals, 1)
  const total = vals.reduce((s, v) => s + v, 0)
  const peak = Math.max(...vals)

  const x = (i: number) => padX + (i / (points.length - 1)) * innerW
  const y = (v: number) => padTop + innerH - (v / max) * innerH

  const line = points.map((p, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(p.value).toFixed(1)}`).join(' ')
  const area = `${line} L${x(points.length - 1).toFixed(1)},${padTop + innerH} L${x(0).toFixed(1)},${padTop + innerH} Z`

  function onMove(e: React.MouseEvent<HTMLDivElement>) {
    const rect = e.currentTarget.getBoundingClientRect()
    const rel = (e.clientX - rect.left) / rect.width
    setHover(Math.min(points.length - 1, Math.max(0, Math.round(rel * (points.length - 1)))))
  }

  const hp = hover != null ? points[hover] : null
  const leftPct = hover != null ? (x(hover) / W) * 100 : 0
  const topPct = hp ? (y(hp.value) / H) * 100 : 0
  const tipLeft = Math.min(90, Math.max(10, leftPct)) // keep tooltip on-canvas

  return (
    <div>
      <div className="flex items-baseline gap-4 mb-3">
        <div>
          <p className="text-2xl font-bold text-sage-900 tabular-nums leading-none">{nf.format(total)}</p>
          <p className="text-xs text-sage-500 mt-1">visitors over {points.length} days</p>
        </div>
        <div className="ml-auto text-right">
          <p className="text-sm font-semibold text-sage-700 tabular-nums leading-none">{nf.format(peak)}</p>
          <p className="text-xs text-sage-400 mt-1">busiest day</p>
        </div>
      </div>

      <div className="relative h-32" onMouseMove={onMove} onMouseLeave={() => setHover(null)}>
        <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="w-full h-32 text-sage-500 overflow-visible" role="img" aria-label="Daily visitors, last 30 days">
          <defs>
            <linearGradient id="trendFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="currentColor" stopOpacity="0.18" />
              <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
            </linearGradient>
          </defs>
          {[0, 0.5, 1].map((f) => (
            <line key={f} x1={padX} x2={W - padX} y1={padTop + innerH * f} y2={padTop + innerH * f} stroke="currentColor" strokeOpacity="0.08" strokeWidth="1" vectorEffect="non-scaling-stroke" />
          ))}
          <path d={area} fill="url(#trendFill)" />
          <path d={line} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
          {hover != null && (
            <line x1={x(hover)} x2={x(hover)} y1={padTop} y2={padTop + innerH} stroke="currentColor" strokeOpacity="0.25" strokeWidth="1" vectorEffect="non-scaling-stroke" />
          )}
        </svg>

        {/* hover dot (HTML overlay, undistorted) */}
        {hp && (
          <span
            className="pointer-events-none absolute w-2.5 h-2.5 rounded-full bg-sage-600 ring-2 ring-white -translate-x-1/2 -translate-y-1/2"
            style={{ left: `${leftPct}%`, top: `${topPct}%` }}
          />
        )}

        {/* tooltip */}
        {hp && (
          <div
            className="pointer-events-none absolute -top-2 -translate-x-1/2 -translate-y-full z-10 rounded-lg bg-sage-900 text-white px-2.5 py-1.5 text-xs whitespace-nowrap shadow-lg"
            style={{ left: `${tipLeft}%` }}
          >
            <span className="font-bold tabular-nums">{nf.format(hp.value)}</span> visitor{hp.value === 1 ? '' : 's'}
            <span className="text-sage-300"> · {fmtFull(hp.date)}</span>
          </div>
        )}
      </div>

      <div className="flex justify-between text-[11px] text-sage-400 mt-2">
        <span>{fmtDay(points[0].date)}</span>
        <span>{fmtDay(points[points.length - 1].date)}</span>
      </div>
    </div>
  )
}
