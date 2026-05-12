'use client'

// Phase 4E — small client island rendered inside <ListPagination>.
// Lets the operator switch between rows-per-page values without
// dropping the rest of the URL state (tab, sort, search). Resets
// ?page= to 1 on change since the previous page number is no longer
// meaningful at a new page size.
//
// Phase 4E hotfix — ROWS_PER_PAGE_OPTIONS + parsePerParam moved into
// rows-per-page.ts (a plain module) so server-side pages can import
// the parser without crossing the 'use client' boundary. This file
// only exports the React component now.

import { useRouter, useSearchParams } from 'next/navigation'
import { ROWS_PER_PAGE_OPTIONS } from './rows-per-page'

export function RowsPerPageSelect({
  basePath,
  currentValue,
  defaultValue,
}: {
  basePath: string
  /** The active rows-per-page (post-validation). */
  currentValue: number
  /** The page config's default — used to keep the URL clean when the
   *  operator picks the default value (no ?per= param emitted). */
  defaultValue: number
}) {
  const router = useRouter()
  const searchParams = useSearchParams()

  function onChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const next = Number(e.target.value)
    const params = new URLSearchParams(searchParams.toString())
    if (Number.isFinite(next) && next !== defaultValue) {
      params.set('per', String(next))
    } else {
      params.delete('per')
    }
    // Always reset to page 1 — same-row index across page sizes is
    // ambiguous.
    params.delete('page')
    router.push(`${basePath}${params.toString() ? `?${params.toString()}` : ''}`)
  }

  return (
    <label className="inline-flex items-center gap-1.5 text-xs text-sage-500">
      <select
        value={currentValue}
        onChange={onChange}
        aria-label="Rows per page"
        className="rounded-md border border-sage-200 bg-white px-2 py-1 text-xs text-sage-800 focus:outline-none focus:ring-2 focus:ring-sage-500"
      >
        {ROWS_PER_PAGE_OPTIONS.map((n) => (
          <option key={n} value={n}>{n}</option>
        ))}
      </select>
      <span>per page</span>
    </label>
  )
}
