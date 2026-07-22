'use client'

// Log a day's mileage: pick the employee, vehicle + tier, add each stop
// (address autocomplete), tap Calculate to get the actual driving km (home
// base → stops → home base), and Save. The reimbursement previews from the
// dated IRD rate config; the SERVER re-resolves it authoritatively on save.
// Changing a stop clears the distance so it's always recalculated.

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, X, Route, Save, Loader2, Home, AlertTriangle } from 'lucide-react'
import { AddressField } from '../../_components/AddressField'
import { computeTripDistanceKm, saveMileageLog } from '../_actions'
import { HOME_BASE } from '@/lib/mileage'
import { formatCurrency } from '@/lib/format'
import {
  resolveMileageRate,
  computeMileageReimbursement,
  VEHICLE_TYPE_LABELS,
  type MileageRateConfig,
  type VehicleType,
  type MileageTier,
} from '@/lib/payroll/mileage-rates'

interface EmployeeOption {
  id: string
  fullName: string
}

export function MileageLogForm({ employees, rateConfigs }: { employees: EmployeeOption[]; rateConfigs: MileageRateConfig[] }) {
  const router = useRouter()
  const [contractorId, setContractorId] = useState(employees[0]?.id ?? '')
  const [vehicleType, setVehicleType] = useState<VehicleType>('petrol')
  const [tier, setTier] = useState<MileageTier>(1)
  const [date, setDate] = useState('')
  const [purpose, setPurpose] = useState('')
  const [stops, setStops] = useState<string[]>([''])
  const [km, setKm] = useState<number | null>(null)
  const [notes, setNotes] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [calcing, startCalc] = useTransition()
  const [saving, startSave] = useTransition()

  function updateStop(i: number, v: string) {
    setStops((s) => s.map((x, j) => (j === i ? v : x)))
    setKm(null)
  }
  function addStop() {
    setStops((s) => [...s, ''])
    setKm(null)
  }
  function removeStop(i: number) {
    setStops((s) => (s.length === 1 ? [''] : s.filter((_, j) => j !== i)))
    setKm(null)
  }

  const cleanedStops = stops.filter((s) => s.trim()).map((s) => ({ address: s.trim() }))

  // Preview the reimbursement from the dated config (the server re-resolves on save).
  const previewRate = date ? resolveMileageRate(rateConfigs, { vehicleType, tier, onDate: date }) : null
  const previewReimbursement = km != null && previewRate ? computeMileageReimbursement(km, previewRate.ratePerKm) : null

  function calculate() {
    setError(null)
    setKm(null)
    startCalc(async () => {
      const res = await computeTripDistanceKm(cleanedStops)
      if (res.error) setError(res.error)
      else setKm(res.km ?? null)
    })
  }

  function save() {
    if (km == null) return
    setError(null)
    startSave(async () => {
      const res = await saveMileageLog({
        logDate: date,
        stops: cleanedStops,
        distanceKm: km,
        notes,
        contractorId,
        businessPurpose: purpose,
        vehicleType,
        tier,
      })
      if (res.error) {
        setError(res.error)
        return
      }
      setDate('')
      setPurpose('')
      setStops([''])
      setKm(null)
      setNotes('')
      router.refresh()
    })
  }

  const canCalc = !!date && cleanedStops.length > 0 && !calcing
  const canSave = km != null && !!contractorId && !!purpose.trim() && !saving

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
      <h2 className="text-sm font-semibold text-sage-800">Log a day</h2>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <label className="block">
          <span className="block text-sm font-semibold text-sage-800 mb-1.5">Employee</span>
          <select value={contractorId} onChange={(e) => setContractorId(e.target.value)} className="w-full rounded-lg border border-sage-200 px-4 py-3 text-sm text-sage-800 focus:outline-none focus:ring-2 focus:ring-sage-500">
            {employees.length === 0 && <option value="">No employees found</option>}
            {employees.map((e) => (
              <option key={e.id} value={e.id}>{e.fullName}</option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="block text-sm font-semibold text-sage-800 mb-1.5">Date</span>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-full rounded-lg border border-sage-200 px-4 py-3 text-sm text-sage-800 focus:outline-none focus:ring-2 focus:ring-sage-500" />
        </label>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <label className="block">
          <span className="block text-sm font-semibold text-sage-800 mb-1.5">Vehicle type</span>
          <select value={vehicleType} onChange={(e) => setVehicleType(e.target.value as VehicleType)} className="w-full rounded-lg border border-sage-200 px-4 py-3 text-sm text-sage-800 focus:outline-none focus:ring-2 focus:ring-sage-500">
            {(Object.keys(VEHICLE_TYPE_LABELS) as VehicleType[]).map((v) => (
              <option key={v} value={v}>{VEHICLE_TYPE_LABELS[v]}</option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="block text-sm font-semibold text-sage-800 mb-1.5">Rate tier</span>
          <select value={tier} onChange={(e) => setTier(Number(e.target.value) as MileageTier)} className="w-full rounded-lg border border-sage-200 px-4 py-3 text-sm text-sage-800 focus:outline-none focus:ring-2 focus:ring-sage-500">
            <option value={1}>Tier 1</option>
            <option value={2}>Tier 2</option>
          </select>
        </label>
      </div>

      {/* Total-vehicle-km rule warning — the tier can't be auto-determined. */}
      <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-[11px] text-amber-800 leading-snug">
        <AlertTriangle size={14} className="mt-0.5 shrink-0" />
        <span>
          <strong>Tier 1</strong> applies to the vehicle&rsquo;s first 14,000 km of <strong>total</strong> annual travel (including private km) — not the first 14,000 work km. Once the vehicle passes 14,000 km total for the year, switch to <strong>Tier 2</strong>. Choose the correct tier manually.
        </span>
      </div>

      <label className="block">
        <span className="block text-sm font-semibold text-sage-800 mb-1.5">Business purpose</span>
        <input value={purpose} onChange={(e) => setPurpose(e.target.value)} placeholder="e.g. quote visit + two cleans in Titirangi" className="w-full rounded-lg border border-sage-200 px-4 py-3 text-sm text-sage-800 focus:outline-none focus:ring-2 focus:ring-sage-500" />
      </label>

      {/* Fixed start */}
      <div className="flex items-center gap-2 text-sm text-sage-500">
        <Home size={15} className="text-sage-400" /> Start: <span className="text-sage-700 font-medium">{HOME_BASE}</span>
      </div>

      {/* Stops */}
      <div className="space-y-3">
        {stops.map((s, i) => (
          <div key={i} className="flex items-end gap-2">
            <AddressField label={`Stop ${i + 1}`} value={s} onChange={(v) => updateStop(i, v)} placeholder="Start typing an address…" className="flex-1" />
            <button type="button" onClick={() => removeStop(i)} className="mb-2 text-sage-400 hover:text-red-600 shrink-0" aria-label="Remove stop">
              <X size={16} />
            </button>
          </div>
        ))}
        <button type="button" onClick={addStop} className="inline-flex items-center gap-1 text-xs font-medium text-sage-600 hover:text-sage-800">
          <Plus size={13} /> Add stop
        </button>
      </div>

      {/* Fixed end */}
      <div className="flex items-center gap-2 text-sm text-sage-500">
        <Home size={15} className="text-sage-400" /> Return: <span className="text-sage-700 font-medium">{HOME_BASE}</span>
      </div>

      <label className="block">
        <span className="block text-sm font-semibold text-sage-800 mb-1.5">Notes (optional)</span>
        <input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="anything extra for the record" className="w-full rounded-lg border border-sage-200 px-4 py-3 text-sm text-sage-800 focus:outline-none focus:ring-2 focus:ring-sage-500" />
      </label>

      {/* Distance + reimbursement + save */}
      <div className="flex flex-wrap items-center gap-3 pt-1">
        <button type="button" onClick={calculate} disabled={!canCalc} className="inline-flex items-center gap-2 border border-sage-200 text-sage-700 font-medium px-4 py-2.5 rounded-lg text-sm hover:bg-sage-50 disabled:opacity-50">
          {calcing ? <Loader2 size={15} className="animate-spin" /> : <Route size={15} />}
          {calcing ? 'Calculating…' : 'Calculate km'}
        </button>

        {km != null && (
          <span className="text-sm text-sage-800">
            <span className="font-bold tabular-nums text-lg">{km}</span> km
            {previewReimbursement != null && (
              <span className="text-sage-500"> · ≈ <span className="font-semibold text-sage-800">{formatCurrency(previewReimbursement)}</span> at ${previewRate?.ratePerKm}/km (Tier {tier})</span>
            )}
          </span>
        )}

        <button type="button" onClick={save} disabled={!canSave} className="ml-auto inline-flex items-center gap-2 bg-sage-500 text-white font-semibold px-5 py-2.5 rounded-lg text-sm hover:bg-sage-700 disabled:opacity-50">
          {saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
          {saving ? 'Saving…' : 'Save day'}
        </button>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  )
}
