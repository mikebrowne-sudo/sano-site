'use client'

import { useRouter } from 'next/navigation'
import { X } from 'lucide-react'

interface Contractor { id: string; full_name: string }

export function CalendarFilters({
  contractors,
  currentContractor,
  currentStatus,
  view,
  date,
}: {
  contractors: Contractor[]
  currentContractor: string
  currentStatus: string
  view: string
  date: string
}) {
  const router = useRouter()

  const hasFilters = currentContractor || currentStatus

  function setParam(key: string, value: string) {
    const params = new URLSearchParams()
    params.set('view', view)
    params.set('date', date)

    const current = { contractor: currentContractor, status: currentStatus }
    current[key as keyof typeof current] = value

    if (current.contractor) params.set('contractor', current.contractor)
    if (current.status) params.set('status', current.status)

    router.push(`/portal/jobs/calendar?${params.toString()}`)
  }

  function clearAll() {
    const params = new URLSearchParams()
    params.set('view', view)
    params.set('date', date)
    router.push(`/portal/jobs/calendar?${params.toString()}`)
  }

  return (
    <div className="flex flex-wrap items-center gap-3 mb-5">
      <select
        value={currentContractor}
        onChange={(e) => setParam('contractor', e.target.value)}
        className="rounded-lg border border-sage-200 px-3 py-2 text-sm text-sage-800 bg-white focus:outline-none focus:ring-2 focus:ring-sage-500"
      >
        <option value="">All contractors</option>
        {contractors.map((c) => (
          <option key={c.id} value={c.id}>{c.full_name}</option>
        ))}
      </select>

      <select
        value={currentStatus}
        onChange={(e) => setParam('status', e.target.value)}
        className="rounded-lg border border-sage-200 px-3 py-2 text-sm text-sage-800 bg-white focus:outline-none focus:ring-2 focus:ring-sage-500"
      >
        <option value="">All statuses</option>
        <option value="unassigned">Unassigned</option>
        <option value="draft">Draft</option>
        <option value="assigned">Assigned</option>
        <option value="in_progress">In Progress</option>
        <option value="completed">Completed</option>
      </select>

      {hasFilters && (
        <button onClick={clearAll} className="inline-flex items-center gap-1.5 px-3 py-2 text-sm text-sage-500 hover:text-sage-700 transition-colors">
          <X size={14} /> Clear
        </button>
      )}
    </div>
  )
}
