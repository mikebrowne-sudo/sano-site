// Phase list-view-uxp-2 — Shared list table primitive.
//
// One presentational component that owns the table shell, mobile
// card switch, bulk-select column wiring, attention-chip placement
// (below the first column), the row-end "Open →" affordance, and an
// optional row-extra-actions slot for per-entity quick actions
// (proposal preview on quotes, send/reminder on invoices, etc.).
//
// Server component. Generic over the row type. The page owns:
//   - data fetching + sort + filter + tabs
//   - the cell() dispatcher that maps a column key to JSX
//   - the BulkSelectProvider wrap (so the action bar mounts at page
//     level — same DOM placement as before)
//   - the empty-state copy per tab
//
// The primitive does NOT touch backend, attention rules, cleanup
// gating, or display settings. It receives whatever the page hands
// it and renders it.

import Link from 'next/link'
import clsx from 'clsx'
import { ArrowRight } from 'lucide-react'
import { BulkSelectCheckbox, BulkSelectHeader } from './BulkSelect'
import { AttentionChips } from './AttentionChips'

export interface ListColumnDef<TRow> {
  key: string
  label: string
  align?: 'left' | 'right'
  cell: (row: TRow) => React.ReactNode
}

export interface PortalListTableProps<TRow extends { id: string }> {
  rows: TRow[]
  columns: ListColumnDef<TRow>[]

  /** Bulk-select column. The page wraps the primitive in
   *  <BulkSelectProvider> so the action bar mounts at page level —
   *  the primitive only renders the header + per-row checkbox cells
   *  when canCleanup is true. */
  bulkSelect?: { canCleanup: boolean }

  /** Row-end "Open →" affordance. Renders for every row. */
  rowHref: (row: TRow) => string
  /** Used in aria-labels (bulk-select checkbox + Open link). */
  rowLabel: (row: TRow) => string

  /** Optional row dimming (test / archived rows). */
  isDimmed?: (row: TRow) => boolean

  /** Attention chips render below the FIRST visible column when
   *  this returns a non-null value. */
  attention?: (row: TRow) => { reasons: string[]; nextStep?: string } | null

  /** Optional per-row quick actions cell. Renders BEFORE the
   *  "Open →" cell on desktop. Mobile is intentionally not wired —
   *  pages that need mobile extras include them in mobile.meta /
   *  mobile.extra slots. */
  rowExtraActions?: (row: TRow) => React.ReactNode

  /** Mobile card slots. The whole card wraps in a single <Link>
   *  to rowHref(row); slot functions must NOT include their own
   *  anchors (avoids nested-<a> HTML errors). */
  mobile: {
    label: (row: TRow) => string
    /** Top of the card. Typical content: number + test/archived
     *  pills + status badge in a flex justify-between row. */
    primary: (row: TRow) => React.ReactNode
    secondary?: (row: TRow) => React.ReactNode
    extra?: (row: TRow) => React.ReactNode  // linked-records line
    meta?: (row: TRow) => React.ReactNode   // date + total etc.
  }
}

function alignClass(align?: 'left' | 'right'): string {
  return align === 'right' ? 'text-right' : 'text-left'
}

export function PortalListTable<TRow extends { id: string }>(
  props: PortalListTableProps<TRow>,
): React.ReactElement {
  const {
    rows, columns, bulkSelect, rowHref, rowLabel,
    isDimmed, attention, rowExtraActions, mobile,
  } = props
  const canCleanup = bulkSelect?.canCleanup ?? false

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
      {/* ─── Desktop table ────────────────────────────────────── */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 text-left text-sage-600">
              {canCleanup && (
                <th className="pl-5 pr-2 py-3 w-8">
                  <BulkSelectHeader />
                </th>
              )}
              {columns.map((col) => (
                <th key={col.key} className={`px-5 py-3 font-semibold ${alignClass(col.align)}`}>
                  {col.label}
                </th>
              ))}
              {rowExtraActions && <th className="px-3 py-3" aria-label="Actions" />}
              <th className="px-3 py-3 text-right" aria-label="Open" />
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const dim = isDimmed?.(row) ?? false
              const att = attention?.(row) ?? null
              return (
                <tr
                  key={row.id}
                  className={clsx(
                    'border-b border-gray-50 last:border-0 hover:bg-gray-50/60 transition-colors',
                    dim && 'opacity-60',
                  )}
                >
                  {canCleanup && (
                    <td className="pl-5 pr-2 py-3 align-top">
                      <BulkSelectCheckbox id={row.id} label={`Select ${rowLabel(row)}`} />
                    </td>
                  )}
                  {columns.map((col, idx) => (
                    <td key={col.key} className={`px-5 py-3 align-top ${alignClass(col.align)}`}>
                      {col.cell(row)}
                      {idx === 0 && att && (att.reasons.length > 0 || att.nextStep) && (
                        <div className="mt-1.5">
                          <AttentionChips reasons={att.reasons} nextStep={att.nextStep} size="xs" />
                        </div>
                      )}
                    </td>
                  ))}
                  {rowExtraActions && (
                    <td className="px-3 py-3 text-right align-top">
                      {rowExtraActions(row)}
                    </td>
                  )}
                  <td className="px-3 py-3 text-right align-top">
                    <Link
                      href={rowHref(row)}
                      className="inline-flex items-center gap-1 text-sage-500 hover:text-sage-800 text-xs font-medium"
                      aria-label={`Open ${rowLabel(row)}`}
                    >
                      Open <ArrowRight size={12} />
                    </Link>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* ─── Mobile card list ──────────────────────────────────── */}
      <div className="md:hidden divide-y divide-gray-100">
        {rows.map((row) => {
          const dim = isDimmed?.(row) ?? false
          const att = attention?.(row) ?? null
          return (
            <div
              key={row.id}
              className={clsx(
                'flex items-start gap-3 px-4 py-4 hover:bg-gray-50 transition-colors',
                dim && 'opacity-60',
              )}
            >
              {canCleanup && (
                <div className="pt-1">
                  <BulkSelectCheckbox id={row.id} label={`Select ${rowLabel(row)}`} />
                </div>
              )}
              <Link href={rowHref(row)} className="block flex-1 min-w-0">
                {mobile.primary(row)}
                {att && (att.reasons.length > 0 || att.nextStep) && (
                  <div className="mb-1">
                    <AttentionChips reasons={att.reasons} nextStep={att.nextStep} size="xs" />
                  </div>
                )}
                {mobile.secondary && (
                  <div className="text-sage-600 text-sm">{mobile.secondary(row)}</div>
                )}
                {mobile.extra && mobile.extra(row)}
                {mobile.meta && (
                  <div className="flex items-center justify-between mt-2 text-xs text-sage-500">
                    {mobile.meta(row)}
                  </div>
                )}
              </Link>
            </div>
          )
        })}
      </div>
    </div>
  )
}
