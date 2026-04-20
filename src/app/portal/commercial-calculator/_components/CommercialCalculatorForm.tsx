'use client'

import { useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import clsx from 'clsx'
import {
  calculateCommercialPrice,
  normaliseFrequency,
  targetMargin,
  minimumCharge,
  type CommercialInputs,
  type PropertyType,
  type LocationType,
  type FrequencyType,
  type TrafficLevel,
  type FitoutLevel,
  type AccessDifficulty,
  type PricingMode,
  type PricingView,
} from '@/lib/commercialPricing'
import { saveCommercialCalculation } from '../_actions'
import { ResultSummary } from './ResultSummary'

function toInt(v: string): number {
  const n = parseInt(v, 10)
  return Number.isFinite(n) ? n : 0
}
function toNum(v: string): number {
  const n = parseFloat(v)
  return Number.isFinite(n) ? n : 0
}

export function CommercialCalculatorForm() {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  // Property
  const [propertyType, setPropertyType] = useState<PropertyType>('office')
  const [mixed, setMixed] = useState(false)
  const [officeM2, setOfficeM2] = useState('')
  const [warehouseM2, setWarehouseM2] = useState('')
  const [retailM2, setRetailM2] = useState('')
  const [medicalM2, setMedicalM2] = useState('')
  const [floors, setFloors] = useState('')
  const [locationType, setLocationType] = useState<LocationType>('suburban')

  // Fixtures
  const [bathrooms, setBathrooms] = useState('')
  const [kitchens, setKitchens] = useState('')
  const [desks, setDesks] = useState('')
  const [bins, setBins] = useState('')

  // Frequency
  const [frequencyType, setFrequencyType] = useState<FrequencyType>('weekly')
  const [visitsPerPeriod, setVisitsPerPeriod] = useState('1')

  // Complexity
  const [trafficLevel, setTrafficLevel] = useState<TrafficLevel>('medium')
  const [fitoutLevel, setFitoutLevel] = useState<FitoutLevel>('standard')
  const [accessDifficulty, setAccessDifficulty] = useState<AccessDifficulty>('easy')

  // Extras
  const [windows, setWindows] = useState('')
  const [carpetM2, setCarpetM2] = useState('')
  const [hardFloorM2, setHardFloorM2] = useState('')
  const [deepClean, setDeepClean] = useState(false)

  // Pricing mode
  const [pricingMode, setPricingMode] = useState<PricingMode>('make_money')

  const primaryM2Setter: Record<PropertyType, (v: string) => void> = {
    office:    setOfficeM2,
    warehouse: setWarehouseM2,
    retail:    setRetailM2,
    medical:   setMedicalM2,
  }
  const primaryM2: Record<PropertyType, string> = {
    office:    officeM2,
    warehouse: warehouseM2,
    retail:    retailM2,
    medical:   medicalM2,
  }

  const inputs: CommercialInputs = {
    property_type: propertyType,
    office_m2:    toNum(officeM2),
    warehouse_m2: toNum(warehouseM2),
    retail_m2:    toNum(retailM2),
    medical_m2:   toNum(medicalM2),
    floors:       toInt(floors),
    location_type: locationType,
    bathrooms: toInt(bathrooms),
    kitchens:  toInt(kitchens),
    windows:   toInt(windows),
    desks:     toInt(desks),
    bins:      toInt(bins),
    frequency_type: frequencyType,
    visits_per_period: Math.max(1, toInt(visitsPerPeriod)),
    traffic_level: trafficLevel,
    fitout_level: fitoutLevel,
    access_difficulty: accessDifficulty,
    carpet_clean_m2: toNum(carpetM2),
    hard_floor_m2:   toNum(hardFloorM2),
    deep_clean: deepClean,
    pricing_mode: pricingMode,
  }

  const totalM2 =
    (inputs.office_m2 ?? 0) + (inputs.warehouse_m2 ?? 0) +
    (inputs.retail_m2 ?? 0) + (inputs.medical_m2 ?? 0)

  const canSubmit = totalM2 > 0 && inputs.visits_per_period >= 1

  const result = useMemo(() => calculateCommercialPrice(inputs), [
    inputs.property_type, inputs.office_m2, inputs.warehouse_m2, inputs.retail_m2, inputs.medical_m2,
    inputs.location_type, inputs.bathrooms, inputs.kitchens, inputs.windows, inputs.desks, inputs.bins,
    inputs.frequency_type, inputs.visits_per_period,
    inputs.traffic_level, inputs.fitout_level, inputs.access_difficulty,
    inputs.carpet_clean_m2, inputs.hard_floor_m2, inputs.deep_clean,
    inputs.pricing_mode,
  ])

  const { effective_visits_per_week } = normaliseFrequency(inputs.frequency_type, inputs.visits_per_period)
  const tMargin = targetMargin(effective_visits_per_week)
  const mCharge = minimumCharge(effective_visits_per_week)

  function handleUsePrice(view: PricingView) {
    setError(null)
    startTransition(async () => {
      const r = await saveCommercialCalculation(inputs, view)
      if ('error' in r) {
        setError(r.error)
        return
      }
      router.push(`/portal/quotes/new?calc_id=${r.id}`)
    })
  }

  return (
    <form onSubmit={(e) => e.preventDefault()} className="max-w-3xl space-y-10">
      {/* Property */}
      <Section title="Property">
        <div className="flex flex-wrap gap-2 mb-4">
          {(['office', 'warehouse', 'retail', 'medical'] as const).map((t) => (
            <Pill key={t} active={propertyType === t} onClick={() => setPropertyType(t)}>{t}</Pill>
          ))}
        </div>
        <Field label={`${propertyType} m²`} type="number" value={primaryM2[propertyType]} onChange={primaryM2Setter[propertyType]} min="0" />
        <label className="flex items-center gap-2 text-sm text-sage-700 mt-3">
          <input type="checkbox" checked={mixed} onChange={(e) => setMixed(e.target.checked)} />
          Mixed site (show additional m² inputs)
        </label>
        {mixed && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
            {propertyType !== 'office'    && <Field label="Office m²"    type="number" value={officeM2}    onChange={setOfficeM2} min="0" />}
            {propertyType !== 'warehouse' && <Field label="Warehouse m²" type="number" value={warehouseM2} onChange={setWarehouseM2} min="0" />}
            {propertyType !== 'retail'    && <Field label="Retail m²"    type="number" value={retailM2}    onChange={setRetailM2} min="0" />}
            {propertyType !== 'medical'   && <Field label="Medical m²"   type="number" value={medicalM2}   onChange={setMedicalM2} min="0" />}
          </div>
        )}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
          <Field label="Floors (optional)" type="number" value={floors} onChange={setFloors} min="0" />
          <div>
            <span className="block text-sm font-semibold text-sage-800 mb-2">Location</span>
            <div className="flex gap-2">
              {(['suburban', 'cbd', 'remote'] as const).map((l) => (
                <Pill key={l} active={locationType === l} onClick={() => setLocationType(l)}>{l}</Pill>
              ))}
            </div>
          </div>
        </div>
      </Section>

      {/* Fixtures */}
      <Section title="Fixtures">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Field label="Bathrooms" type="number" value={bathrooms} onChange={setBathrooms} min="0" />
          <Field label="Kitchens"  type="number" value={kitchens}  onChange={setKitchens} min="0" />
          <Field label="Desks (optional)" type="number" value={desks} onChange={setDesks} min="0" />
          <Field label="Bins (optional)"  type="number" value={bins}  onChange={setBins} min="0" />
        </div>
      </Section>

      {/* Frequency */}
      <Section title="Frequency">
        <div className="flex flex-wrap gap-2 mb-3">
          {(['weekly', 'fortnightly', 'monthly'] as const).map((f) => (
            <Pill key={f} active={frequencyType === f} onClick={() => setFrequencyType(f)}>{f}</Pill>
          ))}
        </div>
        <Field label="Visits per period" type="number" value={visitsPerPeriod} onChange={setVisitsPerPeriod} min="1" />
      </Section>

      {/* Complexity */}
      <Section title="Complexity">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <GroupPicker label="Traffic"  value={trafficLevel}     onChange={setTrafficLevel}     options={['low', 'medium', 'high']} />
          <GroupPicker label="Fitout"   value={fitoutLevel}      onChange={setFitoutLevel}      options={['basic', 'standard', 'premium']} />
          <GroupPicker label="Access"   value={accessDifficulty} onChange={setAccessDifficulty} options={['easy', 'medium', 'hard']} />
        </div>
      </Section>

      {/* Extras */}
      <Section title="One-off extras — not part of recurring service">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Field label="Windows (count)"   type="number" value={windows}      onChange={setWindows}     min="0" />
          <Field label="Carpet clean m²"   type="number" value={carpetM2}     onChange={setCarpetM2}    min="0" />
          <Field label="Hard floor m²"     type="number" value={hardFloorM2}  onChange={setHardFloorM2} min="0" />
        </div>
        <label className="flex items-center gap-2 text-sm text-sage-700 mt-4">
          <input type="checkbox" checked={deepClean} onChange={(e) => setDeepClean(e.target.checked)} />
          Deep clean (one-off)
        </label>
      </Section>

      {/* Pricing mode */}
      <Section title="Pricing mode">
        <div className="flex flex-wrap gap-2">
          {(['win_work', 'make_money', 'premium'] as const).map((m) => (
            <Pill key={m} active={pricingMode === m} onClick={() => setPricingMode(m)}>{m.replace('_', ' ')}</Pill>
          ))}
        </div>
      </Section>

      {/* Summary */}
      <ResultSummary result={result} targetMarginPct={tMargin} minimumCharge={mCharge} />

      {error && <p className="text-red-700 text-sm bg-red-50 rounded-lg px-3 py-2">{error}</p>}

      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          disabled={!canSubmit || isPending}
          onClick={() => handleUsePrice('per_clean')}
          className="bg-sage-600 text-white font-semibold px-4 py-2.5 rounded-lg hover:bg-sage-700 transition-colors disabled:opacity-50"
        >
          {isPending ? 'Saving…' : 'Use per-clean price → quote'}
        </button>
        <button
          type="button"
          disabled={!canSubmit || isPending}
          onClick={() => handleUsePrice('monthly')}
          className="bg-sage-600 text-white font-semibold px-4 py-2.5 rounded-lg hover:bg-sage-700 transition-colors disabled:opacity-50"
        >
          {isPending ? 'Saving…' : 'Use monthly contract value → quote'}
        </button>
      </div>
    </form>
  )
}

// ── Primitives ──────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <fieldset>
      <legend className="text-lg font-semibold text-sage-800 mb-4">{title}</legend>
      {children}
    </fieldset>
  )
}

function Field({
  label, type = 'text', value, onChange, min, step,
}: { label: string; type?: string; value: string; onChange: (v: string) => void; min?: string; step?: string }) {
  return (
    <label className="block">
      <span className="block text-sm font-semibold text-sage-800 mb-1.5">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        min={min}
        step={step}
        className="w-full rounded-lg border border-sage-200 px-3 py-2 text-sage-800 placeholder:text-sage-300 focus:outline-none focus:ring-2 focus:ring-sage-500 text-sm"
      />
    </label>
  )
}

function Pill({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={clsx(
        'px-3 py-1.5 rounded-lg text-sm font-medium capitalize transition-colors',
        active ? 'bg-sage-600 text-white' : 'bg-sage-100 text-sage-700 hover:bg-sage-200',
      )}
    >
      {children}
    </button>
  )
}

function GroupPicker<T extends string>({
  label, value, onChange, options,
}: { label: string; value: T; onChange: (v: T) => void; options: readonly T[] }) {
  return (
    <div>
      <span className="block text-sm font-semibold text-sage-800 mb-2">{label}</span>
      <div className="flex flex-wrap gap-2">
        {options.map((o) => (
          <Pill key={o} active={value === o} onClick={() => onChange(o)}>{o}</Pill>
        ))}
      </div>
    </div>
  )
}
