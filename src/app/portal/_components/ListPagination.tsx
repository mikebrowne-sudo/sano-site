// Phase 4D — pagination footer rendered inside <PortalListTable>'s
// `footer` slot. Mirrors the reference image: "Showing X to Y of N"
// on the left, page chevrons on the right, with a tight numbered
// strip in the middle.
//
// Server component, pure presentational. Page navigation is plain
// URL anchors against the current basePath, with the rest of the
// URL params preserved (tab, sort, search, etc.) so a Back press
// returns the operator to where they were.
//
// The count-of-total comes from a separate Supabase round-trip on
// the page (`.select(..., { count: 'exact', head: true })`). For
// the ~100-row caps we're using, the count query is cheap. When the
// table grows we can drop to a `planned` estimate behind the same
// API.

import Link from 'next/link'
import clsx from 'clsx'
import { ChevronLeft, ChevronRight } from 'lucide-react'

export interface ListPaginationProps {
  /** Total matching rows, post-filter. Null when the page chose not
   *  to count (very large tables, etc.) — the footer falls back to
   *  showing "Showing N rows" without a total. */
  total: number | null
  /** Current page, 1-indexed. */
  page: number
  /** Page size. */
  rowsPerPage: number
  /** Base URL the chevron / number links resolve against. */
  basePath: string
  /** Query params to preserve when generating page links. The `page`
   *  key is overwritten by this component; everything else is
   *  carried through verbatim. */
  preservedParams?: Record<string, string | number | undefined | null>
  /** Number of rows actually rendered on the current page. Distinct
   *  from `rowsPerPage` because the last page may be partial. */
  visibleCount: number
}

function buildHref(basePath: string, preserved: ListPaginationProps['preservedParams'], page: number): string {
  const params = new URLSearchParams()
  if (preserved) {
    for (const [k, v] of Object.entries(preserved)) {
      if (v == null || v === '') continue
      params.set(k, String(v))
    }
  }
  if (page > 1) params.set('page', String(page))
  const q = params.toString()
  return q ? `${basePath}?${q}` : basePath
}

// Numbered strip: always show the first page, the last page, and a
// window of ±1 around the current page. Gaps fill with ellipsis.
// Output is a list of either a number or null (ellipsis marker).
function buildPageStrip(current: number, totalPages: number): (number | null)[] {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, i) => i + 1)
  }
  const pages = new Set<number>([1, totalPages, current, current - 1, current + 1])
  const sorted = Array.from(pages)
    .filter((n) => n >= 1 && n <= totalPages)
    .sort((a, b) => a - b)
  const out: (number | null)[] = []
  for (let i = 0; i < sorted.length; i++) {
    if (i > 0 && sorted[i] - sorted[i - 1] > 1) out.push(null)
    out.push(sorted[i])
  }
  return out
}

export function ListPagination({
  total,
  page,
  rowsPerPage,
  basePath,
  preservedParams,
  visibleCount,
}: ListPaginationProps) {
  const totalPages = total != null ? Math.max(1, Math.ceil(total / rowsPerPage)) : null
  const firstIndex = visibleCount === 0 ? 0 : (page - 1) * rowsPerPage + 1
  const lastIndex  = (page - 1) * rowsPerPage + visibleCount

  const range = total != null
    ? `Showing ${firstIndex.toLocaleString()} to ${lastIndex.toLocaleString()} of ${total.toLocaleString()}`
    : `Showing ${visibleCount.toLocaleString()} row${visibleCount === 1 ? '' : 's'}`

  // Hide chrome entirely when there's nothing to paginate.
  if (totalPages != null && totalPages <= 1) {
    return (
      <div className="flex items-center justify-between text-xs text-sage-500">
        <span>{range}</span>
      </div>
    )
  }

  const prevHref = page > 1 ? buildHref(basePath, preservedParams, page - 1) : null
  const nextHref = totalPages == null || page < totalPages ? buildHref(basePath, preservedParams, page + 1) : null
  const strip = totalPages != null ? buildPageStrip(page, totalPages) : null

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-sage-500">
      <span>{range}</span>
      <div className="flex items-center gap-1">
        <PageChevron href={prevHref} ariaLabel="Previous page">
          <ChevronLeft size={14} />
        </PageChevron>
        {strip?.map((p, i) =>
          p == null ? (
            <span key={`gap-${i}`} className="px-1 text-sage-400">…</span>
          ) : p === page ? (
            <span
              key={p}
              aria-current="page"
              className="inline-flex items-center justify-center h-7 min-w-[28px] px-2 rounded-md bg-sage-100 text-sage-800 font-semibold"
            >
              {p}
            </span>
          ) : (
            <Link
              key={p}
              href={buildHref(basePath, preservedParams, p)}
              className="inline-flex items-center justify-center h-7 min-w-[28px] px-2 rounded-md text-sage-600 hover:bg-sage-50 hover:text-sage-800 transition-colors"
            >
              {p}
            </Link>
          ),
        )}
        <PageChevron href={nextHref} ariaLabel="Next page">
          <ChevronRight size={14} />
        </PageChevron>
      </div>
    </div>
  )
}

function PageChevron({ href, ariaLabel, children }: { href: string | null; ariaLabel: string; children: React.ReactNode }) {
  const cls = clsx(
    'inline-flex items-center justify-center h-7 w-7 rounded-md transition-colors',
    href ? 'text-sage-600 hover:bg-sage-50 hover:text-sage-800' : 'text-sage-300 cursor-not-allowed',
  )
  if (!href) {
    return <span aria-disabled="true" aria-label={ariaLabel} className={cls}>{children}</span>
  }
  return <Link href={href} aria-label={ariaLabel} className={cls}>{children}</Link>
}

/** Helper for pages — coerces the URL ?page= param into a safe 1-indexed
 *  integer. Returns 1 for missing / non-numeric / sub-1 inputs. */
export function parsePageParam(raw: string | undefined): number {
  if (!raw) return 1
  const n = Math.floor(Number(raw))
  if (!Number.isFinite(n) || n < 1) return 1
  return n
}
