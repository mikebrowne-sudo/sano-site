'use client'

import { useState, useTransition } from 'react'
import { AlertTriangle, CheckCircle, Plus, Trash2 } from 'lucide-react'
import clsx from 'clsx'
import { createIncident, resolveIncident, deleteIncident } from '../_actions'

const SEVERITY_LABELS: Record<string, string> = {
  low: 'Low',
  medium: 'Medium',
  high: 'High',
  complaint: 'Complaint',
  performance: 'Performance',
}

const SEVERITY_COLORS: Record<string, string> = {
  low: 'bg-sage-100 text-sage-700',
  medium: 'bg-amber-50 text-amber-700',
  high: 'bg-red-50 text-red-700',
  complaint: 'bg-purple-50 text-purple-700',
  performance: 'bg-blue-50 text-blue-700',
}

interface Incident {
  id: string
  incident_date: string
  severity: string
  description: string
  resolved_at: string | null
  notes: string | null
  created_at: string
}

function fmtDate(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-NZ', { day: 'numeric', month: 'short', year: 'numeric' })
}

export function IncidentList({ contractorId, incidents }: { contractorId: string; incidents: Incident[] }) {
  const [open, setOpen] = useState(false)
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [incidentDate, setIncidentDate] = useState(new Date().toISOString().slice(0, 10))
  const [severity, setSeverity] = useState<string>('low')
  const [description, setDescription] = useState('')
  const [notes, setNotes] = useState('')

  function submit() {
    setError(null)
    if (!description.trim()) { setError('Description is required.'); return }
    startTransition(async () => {
      const r = await createIncident({
        contractor_id: contractorId,
        incident_date: incidentDate,
        severity,
        description: description.trim(),
        notes: notes.trim() || undefined,
      })
      if (r?.error) setError(r.error)
      else {
        setOpen(false)
        setDescription('')
        setNotes('')
        setSeverity('low')
        setIncidentDate(new Date().toISOString().slice(0, 10))
      }
    })
  }

  function resolve(id: string) {
    startTransition(async () => { await resolveIncident(id, contractorId) })
  }

  function remove(id: string) {
    if (!confirm('Delete this incident record?')) return
    startTransition(async () => { await deleteIncident(id, contractorId) })
  }

  return (
    <div>
      <div className="mb-4">
        {!open ? (
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="inline-flex items-center gap-2 bg-sage-500 text-white font-medium px-4 py-2.5 rounded-lg text-sm hover:bg-sage-700 transition-colors"
          >
            <Plus size={14} />
            Add incident
          </button>
        ) : (
          <div className="bg-sage-50 border border-sage-200 rounded-xl p-5 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <label className="block">
                <span className="block text-sm font-semibold text-sage-800 mb-1.5">Date *</span>
                <input
                  type="date"
                  value={incidentDate}
                  onChange={(e) => setIncidentDate(e.target.value)}
                  className="w-full rounded-lg border border-sage-200 px-4 py-3 text-sage-800 focus:outline-none focus:ring-2 focus:ring-sage-500 text-sm bg-white"
                />
              </label>
              <label className="block">
                <span className="block text-sm font-semibold text-sage-800 mb-1.5">Severity *</span>
                <select
                  value={severity}
                  onChange={(e) => setSeverity(e.target.value)}
                  className="w-full rounded-lg border border-sage-200 px-4 py-3 text-sage-800 focus:outline-none focus:ring-2 focus:ring-sage-500 text-sm bg-white"
                >
                  {Object.entries(SEVERITY_LABELS).map(([v, l]) => (
                    <option key={v} value={v}>{l}</option>
                  ))}
                </select>
              </label>
            </div>
            <label className="block">
              <span className="block text-sm font-semibold text-sage-800 mb-1.5">Description *</span>
              <textarea
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="What happened?"
                className="w-full rounded-lg border border-sage-200 px-4 py-3 text-sage-800 placeholder:text-sage-300 focus:outline-none focus:ring-2 focus:ring-sage-500 text-sm bg-white resize-y"
              />
            </label>
            <label className="block">
              <span className="block text-sm font-semibold text-sage-800 mb-1.5">Notes</span>
              <input
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Follow-up, resolution steps, etc."
                className="w-full rounded-lg border border-sage-200 px-4 py-3 text-sage-800 placeholder:text-sage-300 focus:outline-none focus:ring-2 focus:ring-sage-500 text-sm bg-white"
              />
            </label>
            {error && <p className="text-red-600 text-sm">{error}</p>}
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={submit}
                disabled={pending}
                className="bg-sage-500 text-white font-semibold px-5 py-2.5 rounded-lg text-sm hover:bg-sage-700 transition-colors disabled:opacity-50"
              >
                {pending ? 'Saving…' : 'Save'}
              </button>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="text-sm text-sage-600 hover:text-sage-800"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>

      {incidents.length === 0 ? (
        <p className="text-sage-500 text-sm">No incidents recorded.</p>
      ) : (
        <ul className="space-y-3">
          {incidents.map((i) => {
            const resolved = !!i.resolved_at
            return (
              <li
                key={i.id}
                className={clsx(
                  'border rounded-lg p-3',
                  resolved ? 'bg-sage-50/50 border-sage-100 opacity-80' : 'bg-white border-sage-200',
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className={clsx('inline-block px-2 py-0.5 rounded-full text-[10px] font-medium', SEVERITY_COLORS[i.severity] ?? SEVERITY_COLORS.low)}>
                        {SEVERITY_LABELS[i.severity] ?? i.severity}
                      </span>
                      <span className="text-xs text-sage-500">{fmtDate(i.incident_date)}</span>
                      {resolved && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-medium text-emerald-700">
                          <CheckCircle size={10} />
                          Resolved {fmtDate(i.resolved_at)}
                        </span>
                      )}
                      {!resolved && (
                        <AlertTriangle size={12} className="text-amber-600" />
                      )}
                    </div>
                    <p className="text-sm text-sage-800 whitespace-pre-wrap">{i.description}</p>
                    {i.notes && <p className="text-xs text-sage-500 mt-1 whitespace-pre-wrap">{i.notes}</p>}
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {!resolved && (
                      <button
                        type="button"
                        onClick={() => resolve(i.id)}
                        disabled={pending}
                        className="text-xs text-emerald-700 hover:underline px-2 py-1"
                      >
                        Resolve
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => remove(i.id)}
                      disabled={pending}
                      className="text-sage-400 hover:text-red-600 p-1"
                      aria-label="Delete incident"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
