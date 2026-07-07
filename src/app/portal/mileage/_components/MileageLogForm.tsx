'use client'

// Log a day's mileage: pick the date, add each stop (address autocomplete),
// tap Calculate to get the actual driving km (home base → stops → home base),
// then Save. Changing a stop clears the distance so it's always recalculated.

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, X, Route, Save, Loader2, Home } from 'lucide-react'
import { AddressField } from '../../_components/AddressField'
import { computeTripDistanceKm, saveMileageLog } from '../_actions'
import { HOME_BASE } from '@/lib/mileage'

export function MileageLogForm() {
  const router = useRouter()
  const [date, setDate] = useState('')
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
      const res = await saveMileageLog({ logDate: date, stops: cleanedStops, distanceKm: km, notes })
      if (res.error) {
        setError(res.error)
        return
      }
      setDate('')
      setStops([''])
      setKm(null)
      setNotes('')
      router.refresh()
    })
  }

  const canCalc = !!date && cleanedStops.length > 0 && !calcing

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
      <h2 className="text-sm font-semibold text-sage-800">Log a day</h2>

      <label className="block">
        <span className="block text-sm font-semibold text-sage-800 mb-1.5">Date</span>
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="w-full sm:w-56 rounded-lg border border-sage-200 px-4 py-3 text-sm text-sage-800 focus:outline-none focus:ring-2 focus:ring-sage-500"
        />
      </label>

      {/* Fixed start */}
      <div className="flex items-center gap-2 text-sm text-sage-500">
        <Home size={15} className="text-sage-400" /> Start: <span className="text-sage-700 font-medium">{HOME_BASE}</span>
      </div>

      {/* Stops */}
      <div className="space-y-3">
        {stops.map((s, i) => (
          <div key={i} className="flex items-end gap-2">
            <AddressField
              label={`Stop ${i + 1}`}
              value={s}
              onChange={(v) => updateStop(i, v)}
              placeholder="Start typing an address…"
              className="flex-1"
            />
            <button
              type="button"
              onClick={() => removeStop(i)}
              className="mb-2 text-sage-400 hover:text-red-600 shrink-0"
              aria-label="Remove stop"
            >
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
        <input
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="e.g. quote visit + two cleans"
          className="w-full rounded-lg border border-sage-200 px-4 py-3 text-sm text-sage-800 focus:outline-none focus:ring-2 focus:ring-sage-500"
        />
      </label>

      {/* Distance + save */}
      <div className="flex flex-wrap items-center gap-3 pt-1">
        <button
          type="button"
          onClick={calculate}
          disabled={!canCalc}
          className="inline-flex items-center gap-2 border border-sage-200 text-sage-700 font-medium px-4 py-2.5 rounded-lg text-sm hover:bg-sage-50 disabled:opacity-50"
        >
          {calcing ? <Loader2 size={15} className="animate-spin" /> : <Route size={15} />}
          {calcing ? 'Calculating…' : 'Calculate km'}
        </button>

        {km != null && (
          <span className="text-sm text-sage-800">
            <span className="font-bold tabular-nums text-lg">{km}</span> km
          </span>
        )}

        <button
          type="button"
          onClick={save}
          disabled={km == null || saving}
          className="ml-auto inline-flex items-center gap-2 bg-sage-500 text-white font-semibold px-5 py-2.5 rounded-lg text-sm hover:bg-sage-700 disabled:opacity-50"
        >
          {saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
          {saving ? 'Saving…' : 'Save day'}
        </button>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  )
}
