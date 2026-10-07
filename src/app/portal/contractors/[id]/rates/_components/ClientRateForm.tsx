'use client'

// Set or change a worker's rate at one client.
//
// Portal UX rules: full-page form (no modal), large labels, dropdown over
// typing for the client.

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { setClientRate } from '../_actions'

interface ClientOption {
  id: string
  name: string
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10)
}

export function ClientRateForm({
  contractorId,
  clients,
}: {
  contractorId: string
  clients: ClientOption[]
}) {
  const router = useRouter()
  const [clientId, setClientId] = useState('')
  const [rate, setRate] = useState('')
  const [effectiveFrom, setEffectiveFrom] = useState(todayIso())
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    setSuccess(null)

    const result = await setClientRate({
      contractorId,
      clientId,
      hourlyRate: rate,
      effectiveFrom,
      note,
    })

    setBusy(false)
    if (result.error) {
      setError(result.error)
      return
    }
    setSuccess(result.success ?? 'Rate saved.')
    setClientId('')
    setRate('')
    setNote('')
    router.refresh()
  }

  return (
    <section className="bg-white border border-sage-200 rounded-lg p-5">
      <h2 className="text-base font-semibold text-sage-800 mb-1">Set a client rate</h2>
      <p className="text-sm text-sage-500 mb-4">
        Applies to jobs at this client created on or after the effective date. Jobs already
        assigned keep the rate they were assigned at.
      </p>

      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <label htmlFor="rate-client" className="block text-sm font-medium text-sage-800 mb-1.5">
            Client
          </label>
          <select
            id="rate-client"
            value={clientId}
            onChange={(e) => setClientId(e.target.value)}
            required
            className="w-full border border-sage-300 rounded-md px-3 py-2.5 text-sage-800 bg-white focus:outline-none focus:ring-2 focus:ring-sage-400"
          >
            <option value="">Select a client…</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="rate-amount" className="block text-sm font-medium text-sage-800 mb-1.5">
              Hourly rate
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sage-500">$</span>
              <input
                id="rate-amount"
                type="number"
                step="0.01"
                min="0.01"
                value={rate}
                onChange={(e) => setRate(e.target.value)}
                required
                placeholder="32.20"
                className="w-full border border-sage-300 rounded-md pl-7 pr-3 py-2.5 text-sage-800 focus:outline-none focus:ring-2 focus:ring-sage-400"
              />
            </div>
          </div>

          <div>
            <label htmlFor="rate-from" className="block text-sm font-medium text-sage-800 mb-1.5">
              Effective from
            </label>
            <input
              id="rate-from"
              type="date"
              value={effectiveFrom}
              onChange={(e) => setEffectiveFrom(e.target.value)}
              required
              className="w-full border border-sage-300 rounded-md px-3 py-2.5 text-sage-800 focus:outline-none focus:ring-2 focus:ring-sage-400"
            />
          </div>
        </div>

        <div>
          <label htmlFor="rate-note" className="block text-sm font-medium text-sage-800 mb-1.5">
            Note <span className="font-normal text-sage-500">(optional)</span>
          </label>
          <input
            id="rate-note"
            type="text"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="e.g. Agreed with the client, Aug 2026"
            className="w-full border border-sage-300 rounded-md px-3 py-2.5 text-sage-800 focus:outline-none focus:ring-2 focus:ring-sage-400"
          />
        </div>

        {error && (
          <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-md px-3 py-2">
            {error}
          </p>
        )}
        {success && (
          <p className="text-sm text-sage-800 bg-sage-50 border border-sage-200 rounded-md px-3 py-2">
            {success}
          </p>
        )}

        <button
          type="submit"
          disabled={busy || !clientId || !rate}
          className="bg-sage-700 text-white px-5 py-2.5 rounded-md font-medium hover:bg-sage-800 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {busy ? 'Saving…' : 'Save rate'}
        </button>
      </form>
    </section>
  )
}
