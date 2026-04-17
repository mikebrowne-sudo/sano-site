'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { Search, X } from 'lucide-react'
import clsx from 'clsx'

const QUICK_VIEWS = [
  { key: '', label: 'All' },
  { key: 'today', label: 'Today' },
  { key: 'tomorrow', label: 'Tomorrow' },
  { key: 'unassigned', label: 'Unassigned' },
  { key: 'in_progress', label: 'In Progress' },
  { key: 'completed', label: 'Completed' },
]

const SORT_OPTIONS = [
  { value: 'scheduled_asc', label: 'Scheduled (soonest)' },
  { value: 'scheduled_desc', label: 'Scheduled (latest)' },
  { value: 'created_desc', label: 'Newest created' },
  { value: 'created_asc', label: 'Oldest created' },
]

export function JobFilters({
  contractors,
  counts,
}: {
  contractors: { id: string; full_name: string }[]
  counts: { today: number; tomorrow: number; unassigned: number; inProgress: number }
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
    router.push('/portal/jobs')
  }

  const hasFilters = currentView || currentContractor || currentSearch

  const countBadge = (key: string) => {
    const n = key === 'today' ? counts.today
      : key === 'tomorrow' ? counts.tomorrow
      : key === 'unassigned' ? counts.unassigned
      : key === 'in_progress' ? counts.inProgress
      : null
    if (n == null || n === 0) return null
    return n
  }

  return (
    <div className="space-y-4 mb-6">
      {/* Quick view chips */}
      <div className="flex flex-wrap gap-2">
        {QUICK_VIEWS.map((v) => {
          const badge = countBadge(v.key)
          return (
            <button
              key={v.key}
              onClick={() => setParam('view', v.key)}
              className={clsx(
                'inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-sm font-medium transition-colors',
                currentView === v.key
                  ? 'bg-sage-500 text-white'
                  : 'bg-sage-100 text-sage-600 hover:bg-sage-200',
              )}
            >
              {v.label}
              {badge != null && (
                <span className={clsx(
                  'inline-block px-1.5 py-0.5 rounded-full text-xs font-semibold',
                  currentView === v.key ? 'bg-white/20 text-white' : 'bg-sage-200 text-sage-700',
                )}>
                  {badge}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* Search + contractor filter + sort */}
      <div className="flex flex-wrap gap-3">
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
    </div>
  )
}
