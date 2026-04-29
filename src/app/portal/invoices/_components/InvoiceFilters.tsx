'use client'

// Phase list-view-uxp-1: slim filter row for the Invoices list,
// matching the shape of JobFilters. Search runs across invoice
// number, client name and service address (page reads the `q` param
// and applies the OR clause); sort options match the field registry's
// sortable keys.

import { useRouter, useSearchParams } from 'next/navigation'
import { Search, X } from 'lucide-react'

const SORT_OPTIONS = [
  { value: 'created_desc',  label: 'Newest first' },
  { value: 'created_asc',   label: 'Oldest first' },
  { value: 'due_asc',       label: 'Due (soonest)' },
  { value: 'due_desc',      label: 'Due (latest)' },
  { value: 'issued_desc',   label: 'Issued (latest)' },
  { value: 'invoice_asc',   label: 'Invoice # (asc)' },
  { value: 'invoice_desc',  label: 'Invoice # (desc)' },
]

export function InvoiceFilters() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const currentSort = searchParams.get('sort') ?? 'created_desc'
  const currentSearch = searchParams.get('q') ?? ''

  function setParam(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString())
    if (value) params.set(key, value)
    else params.delete(key)
    router.push(`/portal/invoices?${params.toString()}`)
  }

  function clearAll() {
    const params = new URLSearchParams(searchParams.toString())
    params.delete('q')
    params.delete('sort')
    router.push(`/portal/invoices${params.toString() ? `?${params.toString()}` : ''}`)
  }

  const hasFilters = !!currentSearch || currentSort !== 'created_desc'

  return (
    <div className="flex flex-wrap gap-3 mb-4">
      <div className="relative flex-1 min-w-[200px]">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-sage-400" />
        <input
          type="text"
          defaultValue={currentSearch}
          placeholder="Search invoices…"
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
