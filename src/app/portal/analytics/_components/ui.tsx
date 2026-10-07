// Shared presentational pieces for the analytics page (server components).

import clsx from 'clsx'
import type { NameValue } from '@/lib/ga4'
import type { CountChange } from '@/lib/seo-insights'

/* ── Formatting ─────────────────────────────────────────────────────── */

export function n(v: number) {
  return new Intl.NumberFormat('en-NZ').format(v)
}
export const pct = (v: number) => `${(v * 100).toFixed(1)}%`
export const pos = (v: number) => (v > 0 ? v.toFixed(1) : '—')

export const fmtRange = (start: string, end: string) => {
  const f = (iso: string) => new Date(`${iso}T00:00:00Z`).toLocaleDateString('en-NZ', { day: 'numeric', month: 'short', timeZone: 'UTC' })
  return `${f(start)} – ${f(end)}`
}

type Tone = 'up' | 'down' | 'flat'
const toneClass: Record<Tone, string> = { up: 'text-emerald-700', down: 'text-red-600', flat: 'text-sage-400' }

export function countChangeView(c: CountChange): { text: string; tone: Tone } {
  switch (c.kind) {
    case 'no-history': return { text: 'Not enough history yet', tone: 'flat' }
    case 'new': return { text: 'New', tone: 'up' }
    case 'none': return { text: '—', tone: 'flat' }
    case 'abs':
      if (c.value === 0) return { text: 'No change', tone: 'flat' }
      return { text: `${c.value > 0 ? '+' : '−'}${n(Math.abs(c.value))}`, tone: c.value > 0 ? 'up' : 'down' }
    case 'pct': {
      const p = Math.round(c.value * 100)
      if (p === 0) return { text: 'No change', tone: 'flat' }
      return { text: `${p > 0 ? '+' : '−'}${Math.abs(p)}%`, tone: p > 0 ? 'up' : 'down' }
    }
  }
}

/** Position change: positive gain = moved up the results (better). */
export function positionChangeView(gain: number | null, long = false): { text: string; tone: Tone } {
  if (gain === null) return { text: '—', tone: 'flat' }
  if (Math.abs(gain) < 0.1) return { text: 'No change', tone: 'flat' }
  const v = Math.abs(gain).toFixed(1)
  if (long) return gain > 0 ? { text: `Improved ${v} positions`, tone: 'up' } : { text: `Dropped ${v} positions`, tone: 'down' }
  return gain > 0 ? { text: `▲ ${v}`, tone: 'up' } : { text: `▼ ${v}`, tone: 'down' }
}

export function Change({ view, className }: { view: { text: string; tone: Tone }; className?: string }) {
  return <span className={clsx('tabular-nums', toneClass[view.tone], className)}>{view.text}</span>
}

// Friendlier display for the noisier GA dimension values, without losing meaning.
export function prettyLabel(raw: string): string {
  const v = (raw || '').trim()
  if (!v || v === '(not set)') return 'Unattributed'
  if (v === '(direct) / (none)') return 'Direct'
  if (v === '/') return 'Home page'
  return v
}

/* ── Layout ─────────────────────────────────────────────────────────── */

export function Card({ children, className, id }: { children: React.ReactNode; className?: string; id?: string }) {
  return <div id={id} className={clsx('rounded-2xl border border-sage-100 bg-white shadow-[0_1px_3px_rgba(52,76,61,0.05)] p-5', className)}>{children}</div>
}

export function CardHead({ icon: Icon, title, note, sub }: { icon: React.ElementType; title: string; note?: string; sub?: string }) {
  return (
    <div className="mb-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-[15px] font-semibold text-sage-800">
          <Icon size={16} className="text-sage-400 shrink-0" />{title}
        </h2>
        {note && <span className="text-xs font-medium text-sage-400 text-right">{note}</span>}
      </div>
      {sub && <p className="text-xs text-sage-500 mt-1">{sub}</p>}
    </div>
  )
}

export function SectionHeading({ title, sub }: { title: string; sub?: string }) {
  return (
    <div className="pt-3">
      <h2 className="text-lg font-bold text-sage-800">{title}</h2>
      {sub && <p className="text-sm text-sage-500 mt-0.5">{sub}</p>}
    </div>
  )
}

/* ── KPI cards ──────────────────────────────────────────────────────── */

export function Kpi({ icon: Icon, label, value, note, tone }: { icon: React.ElementType; label: string; value: number; note?: string; tone?: 'accent' }) {
  return (
    <div className={clsx(
      'rounded-2xl border p-5 transition-shadow hover:shadow-[0_4px_16px_rgba(52,76,61,0.08)]',
      tone === 'accent' ? 'border-sage-200 bg-sage-50/60' : 'border-sage-100 bg-white shadow-[0_1px_3px_rgba(52,76,61,0.05)]',
    )}>
      <div className="flex items-center justify-between mb-3">
        <span className={clsx('inline-flex items-center justify-center w-9 h-9 rounded-xl', tone === 'accent' ? 'bg-sage-500/15 text-sage-700' : 'bg-sage-50 text-sage-500')}>
          <Icon size={18} />
        </span>
        {note && <span className="text-[11px] font-medium uppercase tracking-wide text-sage-400">{note}</span>}
      </div>
      <p className="text-3xl font-bold text-sage-900 tabular-nums leading-none">{n(value)}</p>
      <p className="text-sm text-sage-500 mt-2">{label}</p>
    </div>
  )
}

export function MiniStat({ icon: Icon, label, value, change }: { icon: React.ElementType; label: string; value: string; change?: { text: string; tone: Tone } }) {
  return (
    <div className="rounded-xl border border-sage-100 bg-white p-3">
      <div className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-sage-400 mb-1">
        <Icon size={13} /> {label}
      </div>
      <p className="text-xl font-bold text-sage-900 tabular-nums">{value}</p>
      {change && <Change view={change} className="block text-xs font-medium mt-0.5" />}
    </div>
  )
}

/* ── Top lists ──────────────────────────────────────────────────────── */

export function ListCard({ icon: Icon, title, rows, mono, empty }: { icon: React.ElementType; title: string; rows: NameValue[]; mono?: boolean; empty?: string }) {
  const max = Math.max(...rows.map((r) => r.value), 1)
  return (
    <Card>
      <CardHead icon={Icon} title={title} />
      {rows.length === 0 ? (
        <p className="text-sm text-sage-400 py-2">{empty ?? 'No data yet.'}</p>
      ) : (
        <ul className="space-y-3">
          {rows.map((r) => {
            const label = prettyLabel(r.label)
            const unattributed = label === 'Unattributed'
            return (
              <li key={r.label}>
                <div className="flex items-center justify-between gap-3 mb-1">
                  <span className={clsx('min-w-0 truncate text-sm', unattributed ? 'italic text-sage-400' : mono ? 'text-sage-700 font-mono text-[13px]' : 'text-sage-700')} title={label}>
                    {label}
                  </span>
                  <span className="shrink-0 text-sm font-semibold text-sage-800 tabular-nums">{n(r.value)}</span>
                </div>
                <div className="h-1.5 rounded-full bg-sage-50 overflow-hidden">
                  <div className="h-full rounded-full bg-sage-300" style={{ width: `${Math.max(3, Math.round((r.value / max) * 100))}%` }} />
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </Card>
  )
}

/* ── Tables ─────────────────────────────────────────────────────────── */

export interface Column {
  label: string
  align?: 'left' | 'right'
  /** Hide on narrow screens (secondary columns). */
  wide?: boolean
}

export function DataTable({ columns, rows, empty }: { columns: Column[]; rows: React.ReactNode[][]; empty?: string }) {
  if (rows.length === 0) return <p className="text-sm text-sage-400 py-2">{empty ?? 'Nothing to show yet.'}</p>
  const cellClass = (c: Column, i: number) => clsx(
    'py-2 align-top',
    i > 0 && 'pl-3',
    c.align === 'right' && 'text-right tabular-nums whitespace-nowrap',
    c.wide && 'hidden md:table-cell',
  )
  return (
    <div className="overflow-x-auto -mx-1 px-1">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-sage-400 border-b border-sage-100">
            {columns.map((c, i) => <th key={c.label} className={clsx(cellClass(c, i), 'font-medium text-xs')}>{c.label}</th>)}
          </tr>
        </thead>
        <tbody>
          {rows.map((cells, r) => (
            <tr key={r} className="border-b border-sage-50 last:border-0">
              {cells.map((cell, i) => <td key={i} className={clsx(cellClass(columns[i], i), 'text-sage-700')}>{cell}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export function Chip({ children, tone = 'sage' }: { children: React.ReactNode; tone?: 'sage' | 'emerald' | 'amber' | 'muted' }) {
  return (
    <span className={clsx(
      'inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium whitespace-nowrap',
      tone === 'emerald' && 'bg-emerald-50 text-emerald-800',
      tone === 'amber' && 'bg-amber-50 text-amber-800',
      tone === 'sage' && 'bg-sage-100 text-sage-700',
      tone === 'muted' && 'bg-sage-50 text-sage-500',
    )}>
      {children}
    </span>
  )
}

export function PathText({ path }: { path?: string }) {
  if (!path) return <span className="text-sage-300">—</span>
  return <span className="font-mono text-[12.5px] text-sage-600 break-all">{path === '/' ? '/ (home)' : path}</span>
}
