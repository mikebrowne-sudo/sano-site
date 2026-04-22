'use client'

// Pricing engine settings — client form (Phase 3B.2).
//
// Four independent sections, one per pricing_* table. Each section
// maintains its own local state and has its own Save button, so a
// typo in one section doesn't block saving another. Feedback shows
// inline per section.
//
// Margin tiers are stored in the DB as decimals (0.18 = 18%) but
// rendered here as whole percentages for operator readability.
// Conversion happens only in this component — server actions and
// helpers keep working in decimals.

import { useState, useTransition } from 'react'
import clsx from 'clsx'
import type { PricingSettings } from '@/lib/pricingSettings'
import type { MarginTier, MarginTierSpec, SectorCategory, TrafficLevel } from '@/lib/commercialQuote'
import {
  saveGlobalSettings,
  saveMarginTiers,
  saveSectorMultipliers,
  saveTrafficMultipliers,
} from '../_actions'

// ── Orderings ──────────────────────────────────────────────────────

const TIER_ORDER: readonly MarginTier[] = ['win_the_work', 'standard', 'premium', 'specialist']
const SECTOR_ORDER: readonly SectorCategory[] = ['office', 'education', 'medical', 'industrial', 'mixed_use', 'custom']
const TRAFFIC_ORDER: readonly TrafficLevel[] = ['low', 'medium', 'high']

const SECTOR_LABELS: Record<SectorCategory, string> = {
  office:     'Office',
  education:  'Education',
  medical:    'Medical',
  industrial: 'Industrial',
  mixed_use:  'Mixed-use',
  custom:     'Custom',
}

const TRAFFIC_LABELS: Record<TrafficLevel, string> = {
  low:    'Low',
  medium: 'Medium',
  high:   'High',
}

// ── Conversion helpers ─────────────────────────────────────────────

function toPct(decimal: number): string {
  // 0.18 → "18"; 0.185 → "18.5"
  return String(Math.round(decimal * 10000) / 100)
}

function fromPct(s: string): number {
  const n = parseFloat(s)
  return Number.isFinite(n) ? n / 100 : NaN
}

function parseNum(s: string): number {
  const n = parseFloat(s)
  return Number.isFinite(n) ? n : NaN
}

// ── Feedback shape ─────────────────────────────────────────────────

type Feedback =
  | { status: 'idle' }
  | { status: 'saving' }
  | { status: 'saved' }
  | { status: 'error'; message: string }

// ══════════════════════════════════════════════════════════════════
//  Top-level form
// ══════════════════════════════════════════════════════════════════

export function PricingEngineForm({ settings }: { settings: PricingSettings }) {
  return (
    <div className="space-y-8">
      <div className="bg-sage-50 border border-sage-100 rounded-lg px-4 py-3 text-sm text-sage-700">
        Changes apply to <strong>new</strong> pricing calculations.
        Existing saved quotes keep their stored breakdown and are not retroactively changed.
      </div>

      <GlobalSection settings={settings} />
      <MarginTiersSection tiers={settings.marginTiers} />
      <SectorMultipliersSection multipliers={settings.sectorMultipliers} />
      <TrafficMultipliersSection multipliers={settings.trafficMultipliers} />
    </div>
  )
}

// ── Global settings ────────────────────────────────────────────────

function GlobalSection({ settings }: { settings: PricingSettings }) {
  const [labour, setLabour] = useState(String(settings.labourCostBasisDefault))
  const [weeks, setWeeks] = useState(String(settings.weeksPerMonth))
  const [fb, setFb] = useState<Feedback>({ status: 'idle' })
  const [isPending, startTransition] = useTransition()

  function handleSave() {
    const lcb = parseNum(labour)
    const wpm = parseNum(weeks)
    if (!Number.isFinite(lcb) || lcb <= 0 || lcb >= 500) {
      setFb({ status: 'error', message: 'Labour cost basis must be > 0 and < 500.' })
      return
    }
    if (!Number.isFinite(wpm) || wpm <= 0 || wpm >= 10) {
      setFb({ status: 'error', message: 'Weeks per month must be > 0 and < 10.' })
      return
    }
    setFb({ status: 'saving' })
    startTransition(async () => {
      const res = await saveGlobalSettings({ labour_cost_basis_default: lcb, weeks_per_month: wpm })
      if ('error' in res) setFb({ status: 'error', message: res.error })
      else setFb({ status: 'saved' })
    })
  }

  return (
    <Section title="Global settings">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <NumField label="Labour cost basis default ($/hr)" value={labour} onChange={setLabour} step="0.01" />
        <NumField label="Weeks per month"                   value={weeks}  onChange={setWeeks}  step="0.01" />
      </div>
      <SaveRow label="Save global settings" onSave={handleSave} feedback={fb} isPending={isPending} />
    </Section>
  )
}

// ── Margin tiers ───────────────────────────────────────────────────

interface TierRowState {
  tier: MarginTier
  label: string
  min: string
  def: string
  max: string
}

function MarginTiersSection({ tiers }: { tiers: Record<MarginTier, MarginTierSpec> }) {
  const [rows, setRows] = useState<TierRowState[]>(() =>
    TIER_ORDER.map((tier) => ({
      tier,
      label: tiers[tier].label,
      min:   toPct(tiers[tier].min),
      def:   toPct(tiers[tier].default),
      max:   toPct(tiers[tier].max),
    })),
  )
  const [fb, setFb] = useState<Feedback>({ status: 'idle' })
  const [isPending, startTransition] = useTransition()

  function updateRow(idx: number, patch: Partial<TierRowState>) {
    setRows((prev) => prev.map((r, i) => (i === idx ? { ...r, ...patch } : r)))
  }

  function handleSave() {
    const parsed = rows.map((r) => ({
      tier: r.tier,
      label: r.label,
      min_pct:     fromPct(r.min),
      default_pct: fromPct(r.def),
      max_pct:     fromPct(r.max),
    }))
    for (const t of parsed) {
      if (!t.label.trim()) {
        setFb({ status: 'error', message: `Tier ${t.tier}: label is required.` })
        return
      }
      if (!Number.isFinite(t.min_pct) || !Number.isFinite(t.default_pct) || !Number.isFinite(t.max_pct)) {
        setFb({ status: 'error', message: `Tier ${t.tier}: all percentages must be numbers.` })
        return
      }
      if (t.min_pct <= 0 || t.max_pct >= 1) {
        setFb({ status: 'error', message: `Tier ${t.tier}: min must be > 0% and max must be < 100%.` })
        return
      }
      if (t.min_pct > t.default_pct || t.default_pct > t.max_pct) {
        setFb({ status: 'error', message: `Tier ${t.tier}: require min ≤ default ≤ max.` })
        return
      }
    }
    setFb({ status: 'saving' })
    startTransition(async () => {
      const res = await saveMarginTiers({ tiers: parsed })
      if ('error' in res) setFb({ status: 'error', message: res.error })
      else setFb({ status: 'saved' })
    })
  }

  return (
    <Section title="Margin tiers">
      <div className="grid grid-cols-[auto,1fr,90px,90px,90px] gap-3 items-center text-xs font-semibold text-sage-600 uppercase tracking-wide pb-2 border-b border-sage-100">
        <span>Tier</span>
        <span>Label</span>
        <span className="text-right">Min %</span>
        <span className="text-right">Default %</span>
        <span className="text-right">Max %</span>
      </div>
      <div className="space-y-2 mt-3">
        {rows.map((r, idx) => (
          <div key={r.tier} className="grid grid-cols-[auto,1fr,90px,90px,90px] gap-3 items-center">
            <code className="text-xs text-sage-500">{r.tier}</code>
            <InlineText value={r.label} onChange={(v) => updateRow(idx, { label: v })} />
            <InlineNum value={r.min}    onChange={(v) => updateRow(idx, { min: v })} />
            <InlineNum value={r.def}    onChange={(v) => updateRow(idx, { def: v })} />
            <InlineNum value={r.max}    onChange={(v) => updateRow(idx, { max: v })} />
          </div>
        ))}
      </div>
      <SaveRow label="Save margin tiers" onSave={handleSave} feedback={fb} isPending={isPending} />
    </Section>
  )
}

// ── Sector multipliers ─────────────────────────────────────────────

function SectorMultipliersSection({ multipliers }: { multipliers: Record<SectorCategory, number> }) {
  const [values, setValues] = useState<Record<SectorCategory, string>>(() => {
    const out = {} as Record<SectorCategory, string>
    for (const s of SECTOR_ORDER) out[s] = String(multipliers[s])
    return out
  })
  const [fb, setFb] = useState<Feedback>({ status: 'idle' })
  const [isPending, startTransition] = useTransition()

  function handleSave() {
    const parsed = SECTOR_ORDER.map((sector_category) => ({
      sector_category,
      multiplier: parseNum(values[sector_category]),
    }))
    for (const m of parsed) {
      if (!Number.isFinite(m.multiplier) || m.multiplier <= 0 || m.multiplier >= 5) {
        setFb({ status: 'error', message: `Sector ${m.sector_category}: multiplier must be > 0 and < 5.` })
        return
      }
    }
    setFb({ status: 'saving' })
    startTransition(async () => {
      const res = await saveSectorMultipliers({ multipliers: parsed })
      if ('error' in res) setFb({ status: 'error', message: res.error })
      else setFb({ status: 'saved' })
    })
  }

  return (
    <Section title="Sector multipliers">
      <div className="space-y-2">
        {SECTOR_ORDER.map((s) => (
          <div key={s} className="grid grid-cols-[160px,1fr,120px] gap-3 items-center">
            <span className="text-sm font-medium text-sage-700">{SECTOR_LABELS[s]}</span>
            <code className="text-xs text-sage-500">{s}</code>
            <InlineNum value={values[s]} onChange={(v) => setValues((p) => ({ ...p, [s]: v }))} />
          </div>
        ))}
      </div>
      <SaveRow label="Save sector multipliers" onSave={handleSave} feedback={fb} isPending={isPending} />
    </Section>
  )
}

// ── Traffic multipliers ────────────────────────────────────────────

function TrafficMultipliersSection({ multipliers }: { multipliers: Record<TrafficLevel, number> }) {
  const [values, setValues] = useState<Record<TrafficLevel, string>>(() => {
    const out = {} as Record<TrafficLevel, string>
    for (const t of TRAFFIC_ORDER) out[t] = String(multipliers[t])
    return out
  })
  const [fb, setFb] = useState<Feedback>({ status: 'idle' })
  const [isPending, startTransition] = useTransition()

  function handleSave() {
    const parsed = TRAFFIC_ORDER.map((traffic_level) => ({
      traffic_level,
      multiplier: parseNum(values[traffic_level]),
    }))
    for (const m of parsed) {
      if (!Number.isFinite(m.multiplier) || m.multiplier <= 0 || m.multiplier >= 5) {
        setFb({ status: 'error', message: `Traffic ${m.traffic_level}: multiplier must be > 0 and < 5.` })
        return
      }
    }
    setFb({ status: 'saving' })
    startTransition(async () => {
      const res = await saveTrafficMultipliers({ multipliers: parsed })
      if ('error' in res) setFb({ status: 'error', message: res.error })
      else setFb({ status: 'saved' })
    })
  }

  return (
    <Section title="Traffic multipliers">
      <div className="space-y-2">
        {TRAFFIC_ORDER.map((t) => (
          <div key={t} className="grid grid-cols-[160px,1fr,120px] gap-3 items-center">
            <span className="text-sm font-medium text-sage-700">{TRAFFIC_LABELS[t]}</span>
            <code className="text-xs text-sage-500">{t}</code>
            <InlineNum value={values[t]} onChange={(v) => setValues((p) => ({ ...p, [t]: v }))} />
          </div>
        ))}
      </div>
      <SaveRow label="Save traffic multipliers" onSave={handleSave} feedback={fb} isPending={isPending} />
    </Section>
  )
}

// ══════════════════════════════════════════════════════════════════
//  Primitives
// ══════════════════════════════════════════════════════════════════

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="bg-white rounded-xl border border-sage-100 p-5">
      <h2 className="text-sm font-semibold text-sage-800 uppercase tracking-wide mb-4">{title}</h2>
      {children}
    </section>
  )
}

function NumField({
  label, value, onChange, step,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  step?: string
}) {
  return (
    <label className="block">
      <span className="block text-xs font-medium text-sage-600 mb-1">{label}</span>
      <input
        type="number"
        inputMode="decimal"
        step={step ?? 'any'}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg border border-sage-200 px-3 py-2 text-sage-800 focus:outline-none focus:ring-2 focus:ring-sage-500 text-sm"
      />
    </label>
  )
}

function InlineText({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full rounded-lg border border-sage-200 px-3 py-1.5 text-sage-800 focus:outline-none focus:ring-2 focus:ring-sage-500 text-sm"
    />
  )
}

function InlineNum({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <input
      type="number"
      inputMode="decimal"
      step="any"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full rounded-lg border border-sage-200 px-3 py-1.5 text-sage-800 focus:outline-none focus:ring-2 focus:ring-sage-500 text-sm text-right font-variant-numeric tabular-nums"
    />
  )
}

function SaveRow({
  label, onSave, feedback, isPending,
}: {
  label: string
  onSave: () => void
  feedback: Feedback
  isPending: boolean
}) {
  return (
    <div className="flex items-center justify-between gap-3 mt-4 pt-4 border-t border-sage-100">
      <FeedbackPill feedback={feedback} />
      <button
        type="button"
        onClick={onSave}
        disabled={isPending || feedback.status === 'saving'}
        className={clsx(
          'inline-flex items-center gap-2 bg-sage-500 text-white font-medium px-4 py-2 rounded-lg text-sm transition-colors',
          (isPending || feedback.status === 'saving')
            ? 'opacity-60 cursor-wait'
            : 'hover:bg-sage-700',
        )}
      >
        {feedback.status === 'saving' ? 'Saving…' : label}
      </button>
    </div>
  )
}

function FeedbackPill({ feedback }: { feedback: Feedback }) {
  if (feedback.status === 'idle')   return <span className="text-xs text-sage-400">Unsaved changes not tracked — click save to persist.</span>
  if (feedback.status === 'saving') return <span className="text-xs text-sage-500">Saving…</span>
  if (feedback.status === 'saved')  return <span className="text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 rounded px-2 py-0.5">Saved</span>
  return <span className="text-xs text-red-700 bg-red-50 border border-red-200 rounded px-2 py-0.5">{feedback.message}</span>
}
