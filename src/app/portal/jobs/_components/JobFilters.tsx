'use client'

// Phase 5.5.14 — slimmed-down filters for the Jobs list.
//
// The legacy chip row (All / Today / Tomorrow / Unassigned / In Progress
// / Completed) was removed when the lifecycle tabs landed — the tabs
// already cover the same operational slices and the chips were
// duplicating the same surface.
//
// What's left: search, contractor filter, date filter (today/tomorrow
// shortcut), sort, clear.

import { useRouter, useSearchParams } from 'next/navigation'
import { Search, X } from 'lucide-react'

const SORT_OPTIONS = [
  { value: 'scheduled_asc', label: 'Scheduled (soonest)' },
  { value: 'scheduled_desc', label: 'Scheduled (latest)' },
  { value: 'created_desc', label: 'Newest created' },
  { value: 'created_asc', label: 'Oldest created' },
]

const DATE_OPTIONS = [
  { value: '',         label: 'Any date' },
  { value: 'today',    label: 'Today' },
  { value: 'tomorrow', label: 'Tomorrow' },
]

export function JobFilters({
  contractors,
}: {
  contractors: { id: string; full_name: string }[]
}) {
  const router = useRouter()
  const searchParams = useSearchParams()

  const currentView = searchParams.get('view') ?? ''
  const currentContractor = searchParams.get('contractor') ?? ''
  const currentSort = searchParams.get('sort') ?? 'scheduled_asc'
  const currentSearch = searchParams.get('q') ?? ''

  function setParam(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString())
    if (value) {
      params.set(key, value)
    } else {
      params.delete(key)
    }
    router.push(`/portal/jobs?${params.toString()}`)
  }

  function clearAll() {
    // Keep the lifecycle tab + show_archived; only clear filters.
    const params = new URLSearchParams(searchParams.toString())
    params.delete('view')
    params.delete('contractor')
    params.delete('q')
    params.delete('sort')
    router.push(`/portal/jobs${params.toString() ? `?${params.toString()}` : ''}`)
  }

  const hasFilters = currentView || currentContractor || currentSearch

  return (
    <div className="flex flex-wrap gap-3 mb-4">
      <div className="relative flex-1 min-w-[200px]">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-sage-400" />
        <input
          type="text"
          defaultValue={currentSearch}
          placeholder="Search jobs…"
          onKeyDown={(e) => {
            if (e.key === 'Enter') setParam('q', (e.target as HTMLInputElement).value)
          }}
          onBlur={(e) => {
            if (e.target.value !== currentSearch) setParam('q', e.target.value)
          }}
          className="w-full rounded-lg border border-sage-200 pl-9 pr-4 py-2.5 text-sm text-sage-800 placeholder:text-sage-300 focus:outline-none focus:ring-2 focus:ring-sage-500 focus:border-transparent"
        />
      </div>

      <select
        value={currentView}
        onChange={(e) => setParam('view', e.target.value)}
        className="rounded-lg border border-sage-200 px-3 py-2.5 text-sm text-sage-800 bg-white focus:outline-none focus:ring-2 focus:ring-sage-500"
      >
        {DATE_OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>

      <select
        value={currentContractor}
        onChange={(e) => setParam('contractor', e.target.value)}
        className="rounded-lg border border-sage-200 px-3 py-2.5 text-sm text-sage-800 bg-white focus:outline-none focus:ring-2 focus:ring-sage-500"
      >
        <option value="">All contractors</option>
        {contractors.map((c) => (
          <option key={c.id} value={c.id}>{c.full_name}</option>
        ))}
      </select>

      <select
        value={currentSort}
        onChange={(e) => setParam('sort', e.target.value)}
        className="rounded-lg border border-sage-200 px-3 py-2.5 text-sm text-sage-800 bg-white focus:outline-none focus:ring-2 focus:ring-sage-500"
      >
        {SORT_OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>

      {hasFilters && (
        <button
          onClick={clearAll}
          className="inline-flex items-center gap-1.5 px-3 py-2.5 text-sm text-sage-500 hover:text-sage-700 transition-colors"
        >
          <X size={14} />
          Clear
        </button>
      )}
    </div>
  )
}
