'use client'

// Residential pricing settings form — admin only.
//
// Compact one-page editor: rate + base hours + service multipliers
// + condition multipliers + addon minutes. Saves via the
// saveResidentialPricingSettings action. The Reset button restores
// the code-defined defaults (useful if a value drift makes pricing
// look wrong).

import { useState, useTransition } from 'react'
import { Save, RotateCcw, Loader2 } from 'lucide-react'
import {
  saveResidentialPricingSettings,
  resetResidentialPricingSettings,
} from '../_actions-residential'
import {
  FALLBACK_RESIDENTIAL_PRICING_SETTINGS,
  type ResidentialPricingSettings,
} from '@/lib/residentialPricingSettings'

const SERVICE_TYPE_LABELS: Record<string, string> = {
  'residential.standard_clean':         'Residential — Standard',
  'residential.deep_clean':             'Residential — Deep',
  'residential.move_in_out':            'Residential — Move in / out',
  'residential.pre_sale':               'Residential — Pre-sale',
  'residential.post_construction':      'Residential — Post-construction',
  'property_management.routine':        'PM — Routine',
  'property_management.end_of_tenancy': 'PM — End of tenancy',
  'property_management.pre_inspection': 'PM — Pre-inspection',
  'property_management.handover':       'PM — Handover',
  'airbnb.turnover':                    'Airbnb — Turnover',
  'airbnb.deep_reset':                  'Airbnb — Deep reset',
}

const CONDITION_LABELS: Record<string, string> = {
  average_condition:  'Average condition',
  build_up_present:   'Build-up present',
  furnished_property: 'Furnished property',
  recently_renovated: 'Recently renovated',
  inspection_focus:   'Inspection focus (PM)',
}

const ADDON_LABELS: Record<string, string> = {
  oven_clean:                'Oven deep clean',
  fridge_clean:              'Fridge interior clean',
  carpet_cleaning:           'Carpet cleaning',
  upholstery_cleaning:       'Upholstery cleaning',
  exterior_window:           'Exterior window cleaning',
  pressure_washing:          'Pressure washing',
  rubbish_removal:           'Rubbish removal',
  garage_full:               'Garage full clean',
  inside_cupboards:          'Inside cupboards & drawers',
  inside_wardrobes:          'Inside wardrobes',
  blinds_shutters:           'Blinds / shutters',
  full_wall_wash:            'Full wall wash',
  high_dusting:              'High dusting',
  balcony_deck:              'Balcony / deck clean',
  heavy_grease:              'Heavy grease treatment',
  mould_treatment:           'Heavy mould treatment',
  post_construction_residue: 'Post-construction residue',
  // Legacy codes (still resolvable; usually hidden on the picker but
  // editable here in case an admin needs to tweak their hours).
  interior_window:           'Interior window cleaning (legacy)',
  wall_spot_cleaning:        'Wall spot cleaning (legacy)',
  spot_treatment:            'Spot treatment (legacy)',
}

export function ResidentialPricingForm({ settings }: { settings: ResidentialPricingSettings }) {
  const [pending, startTransition] = useTransition()
  const [feedback, setFeedback] = useState<null | { kind: 'ok' | 'error'; text: string }>(null)
  const [values, setValues] = useState<ResidentialPricingSettings>(settings)

  function setField<K extends keyof ResidentialPricingSettings>(
    k: K, v: ResidentialPricingSettings[K],
  ) {
    setValues((s) => ({ ...s, [k]: v }))
    setFeedback(null)
  }

  function setServiceMultiplier(key: string, v: number) {
    setValues((s) => ({ ...s, service_multipliers: { ...s.service_multipliers, [key]: v } }))
    setFeedback(null)
  }
  function setConditionMultiplier(key: string, v: number) {
    setValues((s) => ({ ...s, condition_multipliers: { ...s.condition_multipliers, [key]: v } }))
    setFeedback(null)
  }
  function setBedroomHours(bed: string, v: number) {
    setValues((s) => ({ ...s, base_hours_by_bedroom: { ...s.base_hours_by_bedroom, [bed]: v } }))
    setFeedback(null)
  }
  function setAddonHours(key: string, v: number) {
    setValues((s) => ({ ...s, addon_hours: { ...s.addon_hours, [key]: v } }))
    setFeedback(null)
  }

  function onSave(e: React.FormEvent) {
    e.preventDefault()
    setFeedback(null)
    startTransition(async () => {
      const r = await saveResidentialPricingSettings(values)
      if ('error' in r) { setFeedback({ kind: 'error', text: r.error }); return }
      setFeedback({ kind: 'ok', text: 'Settings saved.' })
    })
  }

  function onReset() {
    if (!confirm('Reset to code defaults? This restores every value to the original constants.')) return
    setFeedback(null)
    startTransition(async () => {
      const r = await resetResidentialPricingSettings()
      if ('error' in r) { setFeedback({ kind: 'error', text: r.error }); return }
      setValues(FALLBACK_RESIDENTIAL_PRICING_SETTINGS)
      setFeedback({ kind: 'ok', text: 'Reset to defaults.' })
    })
  }

  return (
    <form onSubmit={onSave} className="space-y-8">
      <Section title="Hourly rate + service fee">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Num label="Default hourly rate ($)" value={values.default_hourly_rate} step={1}
            onChange={(v) => setField('default_hourly_rate', v)} />
          <Num label="Service fee ($)" value={values.service_fee} step={1}
            onChange={(v) => setField('service_fee', v)} />
        </div>
      </Section>

      <Section title="Time policy">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Num label="Minimum job (hours)" value={values.minimum_job_hours} step={0.25}
            onChange={(v) => setField('minimum_job_hours', v)} />
          <Num label="Buffer — standard" value={values.buffer_standard} step={0.01}
            onChange={(v) => setField('buffer_standard', v)} hint="0.05 = 5%" />
          <Num label="Buffer — heavy" value={values.buffer_heavy} step={0.01}
            onChange={(v) => setField('buffer_heavy', v)} hint="0.08 = 8%" />
          <Num label="Round step (hours)" value={values.rounding_step_hours} step={0.25}
            onChange={(v) => setField('rounding_step_hours', v)} hint="0.5 = round to nearest half hour" />
          <Num label="Bathroom extra (hours)" value={values.bathroom_extra_hours} step={0.25}
            onChange={(v) => setField('bathroom_extra_hours', v)} hint="per extra bathroom beyond first" />
          <Num label="High-use extra (hours)" value={values.high_use_extra_hours} step={0.25}
            onChange={(v) => setField('high_use_extra_hours', v)} hint="when high_use_areas tag set" />
        </div>
      </Section>

      <Section title="Base hours by bedroom count">
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
          {Object.keys(values.base_hours_by_bedroom).sort((a, b) => Number(a) - Number(b)).map((b) => (
            <Num key={b} label={`${b} bed`}
              value={values.base_hours_by_bedroom[b]} step={0.25}
              onChange={(v) => setBedroomHours(b, v)} />
          ))}
        </div>
      </Section>

      <Section title="Service-type multipliers">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {Object.keys(values.service_multipliers).map((k) => (
            <Num key={k} label={SERVICE_TYPE_LABELS[k] ?? k}
              value={values.service_multipliers[k]} step={0.05}
              onChange={(v) => setServiceMultiplier(k, v)} />
          ))}
        </div>
      </Section>

      <Section title="Condition multipliers + cap" hint="Multi-tag combine: min(cap, m1 + 0.5×Σ(m_i − 1)).">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {Object.keys(values.condition_multipliers).map((k) => (
            <Num key={k} label={CONDITION_LABELS[k] ?? k}
              value={values.condition_multipliers[k]} step={0.01}
              onChange={(v) => setConditionMultiplier(k, v)} />
          ))}
        </div>
        <div className="mt-3 max-w-xs">
          <Num label="Combined multiplier cap" value={values.condition_multiplier_cap}
            step={0.05} onChange={(v) => setField('condition_multiplier_cap', v)} />
        </div>
      </Section>

      <Section title="Add-on hours">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {Object.keys(values.addon_hours).map((k) => (
            <Num key={k} label={ADDON_LABELS[k] ?? k}
              value={values.addon_hours[k]} step={0.25}
              onChange={(v) => setAddonHours(k, v)} />
          ))}
        </div>
      </Section>

      <div className="flex items-center gap-3 flex-wrap pt-3 border-t border-sage-100">
        <button type="submit" disabled={pending}
          className="inline-flex items-center gap-2 bg-sage-500 text-white font-semibold px-5 py-2.5 rounded-lg text-sm hover:bg-sage-700 transition-colors disabled:opacity-50 min-h-[44px]">
          {pending ? <Loader2 size={14} className="animate-spin" /> : <Save size={16} />}
          {pending ? 'Saving…' : 'Save residential settings'}
        </button>
        <button type="button" onClick={onReset} disabled={pending}
          className="inline-flex items-center gap-2 border border-sage-200 text-sage-700 font-medium px-4 py-2.5 rounded-lg text-sm hover:bg-sage-50 transition-colors disabled:opacity-50">
          <RotateCcw size={14} /> Reset to defaults
        </button>
        {feedback?.kind === 'ok' && <span className="text-sm text-emerald-700">{feedback.text}</span>}
        {feedback?.kind === 'error' && <span className="text-sm text-red-600">{feedback.text}</span>}
      </div>
    </form>
  )
}

function Section({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <section className="bg-white rounded-2xl border border-sage-100 shadow-sm p-6">
      <header className="mb-4">
        <h2 className="text-base font-semibold text-sage-800">{title}</h2>
        {hint && <p className="text-xs text-sage-500 mt-0.5">{hint}</p>}
      </header>
      {children}
    </section>
  )
}

function Num({
  label, value, step = 0.01, onChange, hint,
}: {
  label: string
  value: number
  step?: number
  onChange: (v: number) => void
  hint?: string
}) {
  return (
    <label className="block">
      <span className="block text-xs font-semibold text-sage-700 uppercase tracking-wide mb-1.5">{label}</span>
      <input
        type="number"
        value={Number.isFinite(value) ? value : 0}
        step={step}
        onChange={(e) => {
          const v = parseFloat(e.target.value)
          onChange(Number.isFinite(v) ? v : 0)
        }}
        className="w-full border border-sage-200 rounded-lg px-3 py-2 text-sm bg-white text-sage-800 focus:outline-none focus:ring-2 focus:ring-sage-300"
      />
      {hint && <span className="block text-[11px] text-sage-500 mt-1">{hint}</span>}
    </label>
  )
}
