'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import clsx from 'clsx'
import type { InvoicedFilter, MarginSort } from '../../_lib/job-margins'

const BASE = '/portal/finance/job-margins'

/** Invoiced-status + customer + margin-sort filters. All URL-driven and merged
 *  with the period params so every filter coexists (and is shareable). */
export function MarginFilters({
  invoiced, customerId, sort, customers,
}: {
  invoiced: InvoicedFilter
  customerId: string | null
  sort: MarginSort
  customers: { id: string; name: string }[]
}) {
  const router = useRouter()
  const searchParams = useSearchParams()

  function push(next: Record<string, string | null>) {
    const params = new URLSearchParams(searchParams?.toString() ?? '')
    for (const [k, v] of Object.entries(next)) {
      if (v == null || v === '') params.delete(k)
      else params.set(k, v)
    }
    router.push(`${BASE}?${params.toString()}`)
  }

  const pill = (active: boolean) =>
    clsx('px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
      active ? 'bg-sage-500 text-white' : 'bg-sage-100 text-sage-600 hover:bg-sage-200')
  const selectCls = 'rounded-lg border border-sage-200 px-3 py-2 text-sm bg-white text-sage-700'

  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mb-5">
      {/* Invoiced status */}
      <div className="flex items-center gap-1.5">
        <span className="text-[11px] uppercase tracking-wide text-sage-400 mr-1">Invoiced</span>
        {(['all', 'invoiced', 'not_invoiced'] as const).map((v) => (
          <button key={v} onClick={() => push({ invoiced: v === 'all' ? null : v })} className={pill(invoiced === v)}>
            {v === 'all' ? 'All' : v === 'invoiced' ? 'Invoiced' : 'Not invoiced'}
          </button>
        ))}
      </div>

      {/* Customer */}
      <label className="flex items-center gap-1.5">
        <span className="text-[11px] uppercase tracking-wide text-sage-400">Customer</span>
        <select className={selectCls} value={customerId ?? ''} onChange={(e) => push({ customer: e.target.value || null })}>
          <option value="">All customers</option>
          {customers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </label>

      {/* Sort */}
      <label className="flex items-center gap-1.5">
        <span className="text-[11px] uppercase tracking-wide text-sage-400">Sort</span>
        <select className={selectCls} value={sort} onChange={(e) => push({ sort: e.target.value === 'default' ? null : e.target.value })}>
          <option value="default">Needs review first</option>
          <option value="margin_desc">Margin: high → low</option>
          <option value="margin_asc">Margin: low → high</option>
        </select>
      </label>
    </div>
  )
}
