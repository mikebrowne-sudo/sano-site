// Phase 4E — shared client-side controls consumed by the per-page
// filter components (JobFilters / QuoteFilters / InvoiceFilters).
//
// One <SearchInput> shape, one <ToolbarSelect> shape, one
// <ClearFiltersLink>. Per-page filters compose these and pass them
// into <ListToolbar>'s slots so the three lists look identical above
// the table without any inline class soup.

'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { Search, X } from 'lucide-react'

const INPUT_BASE = 'rounded-lg border border-sage-200 text-sm text-sage-800 bg-white focus:outline-none focus:ring-2 focus:ring-sage-500 focus:border-transparent'

/** Search input. Submits on Enter and on blur when the value changed —
 *  same UX pattern the JobFilters / InvoiceFilters components used,
 *  now in one place. */
export function SearchInput({
  basePath,
  placeholder,
  paramKey = 'q',
}: {
  basePath: string
  placeholder?: string
  paramKey?: string
}) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const current = searchParams.get(paramKey) ?? ''

  function commit(value: string) {
    if (value === current) return
    const params = new URLSearchParams(searchParams.toString())
    if (value) params.set(paramKey, value)
    else params.delete(paramKey)
    // Phase 4E — typing into search resets to page 1 (any stale
    // ?page=N from a previous query no longer makes sense).
    params.delete('page')
    router.push(`${basePath}${params.toString() ? `?${params.toString()}` : ''}`)
  }

  return (
    <div className="relative">
      <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-sage-400" />
      <input
        type="text"
        defaultValue={current}
        placeholder={placeholder ?? 'Search…'}
        onKeyDown={(e) => {
          if (e.key === 'Enter') commit((e.target as HTMLInputElement).value)
        }}
        onBlur={(e) => commit(e.target.value)}
        className={`w-full ${INPUT_BASE} pl-9 pr-4 py-2.5 placeholder:text-sage-300`}
      />
    </div>
  )
}

/** Toolbar dropdown. Single onChange → URL navigation. Empty-string
 *  values delete the param entirely so the URL stays clean. */
export function ToolbarSelect({
  basePath,
  paramKey,
  value,
  options,
  resetPageOnChange = true,
}: {
  basePath: string
  paramKey: string
  value: string
  options: readonly { value: string; label: string }[]
  /** Defaults true — most filter changes invalidate the current
   *  page-N. Pass false on the rows-per-page selector to preserve it. */
  resetPageOnChange?: boolean
}) {
  const router = useRouter()
  const searchParams = useSearchParams()

  function setParam(next: string) {
    const params = new URLSearchParams(searchParams.toString())
    if (next) params.set(paramKey, next)
    else params.delete(paramKey)
    if (resetPageOnChange) params.delete('page')
    router.push(`${basePath}${params.toString() ? `?${params.toString()}` : ''}`)
  }

  return (
    <select
      value={value}
      onChange={(e) => setParam(e.target.value)}
      className={`${INPUT_BASE} px-3 py-2.5`}
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>{o.label}</option>
      ))}
    </select>
  )
}

/** Inline "Clear" link rendered when any filter is active. Caller
 *  supplies the list of param keys to wipe. */
export function ClearFiltersLink({
  basePath,
  paramKeys,
  visible,
  preserve = [],
}: {
  basePath: string
  paramKeys: readonly string[]
  visible: boolean
  /** Params to preserve when clearing — typically `tab`,
   *  `show_archived`. The lifecycle tab + cleanup-mode toggle don't
   *  count as "filters" the operator wants gone. */
  preserve?: readonly string[]
}) {
  const router = useRouter()
  const searchParams = useSearchParams()

  if (!visible) return null

  function clear() {
    const params = new URLSearchParams()
    for (const key of preserve) {
      const v = searchParams.get(key)
      if (v) params.set(key, v)
    }
    router.push(`${basePath}${params.toString() ? `?${params.toString()}` : ''}`)
  }

  return (
    <button
      type="button"
      onClick={clear}
      className="inline-flex items-center gap-1.5 px-3 py-2.5 text-sm text-sage-500 hover:text-sage-700 transition-colors"
    >
      <X size={14} />
      Clear
    </button>
  )
}
