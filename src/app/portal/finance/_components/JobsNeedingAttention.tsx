// Phase G.2 step 2 — "Jobs needing attention" widget on /portal/finance.
//
// Signal-not-gate. Surfaces jobs with cleanup issues that may affect
// invoicing, contractor pay, or finance reporting. Each row links
// back to the job page so admin can fix the issue in place.
//
// Data is pre-shaped by buildFinanceAttentionRows in
// src/lib/finance-attention-data.ts.

import Link from 'next/link'
import clsx from 'clsx'
import type { FinanceAttentionRow } from '@/lib/finance-attention-data'

// UI-only relabel — underlying helper severity values stay as
// 'hard' | 'warning' | 'info' so callers and tests don't shift.
const SEVERITY_STYLES: Record<FinanceAttentionRow['flag']['severity'], string> = {
  hard:    'bg-red-50 text-red-700',
  warning: 'bg-amber-50 text-amber-700',
  info:    'bg-sage-50 text-sage-700',
}
const SEVERITY_LABELS: Record<FinanceAttentionRow['flag']['severity'], string> = {
  hard:    'Needs fixing',
  warning: 'Check',
  info:    'Info',
}

function otherFlagsLabel(count: number): string {
  return count === 1 ? '+1 other cleanup item' : `+${count} other cleanup items`
}

export interface JobsNeedingAttentionProps {
  rows: FinanceAttentionRow[]
  /** Total issue-bearing jobs across the period (may exceed rows.length when capped). */
  totalIssueCount: number
  /** Row cap actually applied (used only for the "showing X of Y" footer). */
  limit: number
  /** Counts of issue-bearing jobs grouped by their primary severity. */
  severityCounts: { hard: number; warning: number; info: number }
}

export function JobsNeedingAttention({ rows, totalIssueCount, limit, severityCounts }: JobsNeedingAttentionProps) {
  const headingCount = totalIssueCount > 0 ? ` (${totalIssueCount})` : ''
  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 mb-6">
      <h2 className="text-lg font-semibold text-sage-800">
        Jobs needing attention{headingCount}
      </h2>
      <p className="text-sm text-sage-500 mt-1">
        Jobs with missing rates, hours, approvals, invoice links, or other cleanup items
        that may affect invoicing, contractor pay, or reporting.
      </p>
      {totalIssueCount > 0 && (
        <p className="text-sm text-sage-600 mt-2 mb-4">
          <span className="text-red-700 font-medium">{severityCounts.hard}</span> need fixing
          {' · '}
          <span className="text-amber-700 font-medium">{severityCounts.warning}</span> to check
          {' · '}
          <span className="text-sage-700 font-medium">{severityCounts.info}</span> info
        </p>
      )}
      {totalIssueCount === 0 && <div className="mb-4" />}

      {rows.length === 0 ? (
        <p className="text-sage-500 text-sm">
          No finance cleanup issues found for this period.
        </p>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-left text-sage-600">
                  <th className="px-4 py-2.5 font-semibold">Job</th>
                  <th className="px-4 py-2.5 font-semibold">Client</th>
                  <th className="px-4 py-2.5 font-semibold">Issue</th>
                  <th className="px-4 py-2.5 font-semibold">Suggested action</th>
                  <th className="px-4 py-2.5 font-semibold">Severity</th>
                  <th className="px-4 py-2.5 font-semibold text-right" aria-label="Link"></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.jobId} className="border-b border-gray-50 group">
                    <td className="p-0">
                      <Link
                        href={`/portal/jobs/${row.jobId}`}
                        className="block px-4 py-2.5 group-hover:bg-gray-50 transition-colors font-medium text-sage-800"
                      >
                        {row.jobNumber ?? '—'}
                      </Link>
                    </td>
                    <td className="p-0">
                      <Link
                        href={`/portal/jobs/${row.jobId}`}
                        className="block px-4 py-2.5 group-hover:bg-gray-50 transition-colors text-sage-700 max-w-[200px] truncate"
                      >
                        {row.clientName ?? '—'}
                      </Link>
                    </td>
                    <td className="p-0">
                      <Link
                        href={`/portal/jobs/${row.jobId}`}
                        className="block px-4 py-2.5 group-hover:bg-gray-50 transition-colors text-sage-700"
                      >
                        {row.flag.message}
                        {row.otherFlagCount > 0 && (
                          <span className="ml-2 text-xs text-sage-500">
                            {otherFlagsLabel(row.otherFlagCount)}
                          </span>
                        )}
                      </Link>
                    </td>
                    <td className="p-0">
                      <Link
                        href={row.flag.href ?? `/portal/jobs/${row.jobId}`}
                        className="block px-4 py-2.5 group-hover:bg-gray-50 transition-colors text-sage-600"
                      >
                        {row.flag.suggestedAction ?? '—'}
                      </Link>
                    </td>
                    <td className="p-0">
                      <Link
                        href={`/portal/jobs/${row.jobId}`}
                        className="block px-4 py-2.5 group-hover:bg-gray-50 transition-colors"
                      >
                        <span
                          className={clsx(
                            'inline-block px-2.5 py-0.5 rounded-full text-xs font-medium',
                            SEVERITY_STYLES[row.flag.severity],
                          )}
                        >
                          {SEVERITY_LABELS[row.flag.severity]}
                        </span>
                      </Link>
                    </td>
                    <td className="p-0">
                      <Link
                        href={`/portal/jobs/${row.jobId}`}
                        className="block px-4 py-2.5 group-hover:bg-gray-50 transition-colors text-right text-sage-500"
                      >
                        →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {totalIssueCount > limit && (
            <p className="text-xs text-sage-500 mt-3">
              Showing {limit} of {totalIssueCount} issues. Narrow the period to see more.
            </p>
          )}
        </>
      )}
    </div>
  )
}
