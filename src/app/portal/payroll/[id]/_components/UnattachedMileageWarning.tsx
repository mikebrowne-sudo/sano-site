// Warns that approved/draft mileage is NOT in this pay run.
//
// Mileage is captured when a run is CREATED, not when it's approved. Approve a
// mileage log after its run already exists and the run's frozen figures show
// $0.00 mileage — the log stays unattached and the employee is underpaid, with
// nothing on screen to say so.
//
// This has happened twice. The warning therefore sits on the pay run page
// itself, above the approve control, and states the consequence rather than
// just a number.

import Link from 'next/link'
import { AlertTriangle } from 'lucide-react'
import type { UnattachedMileageSummary } from '@/lib/payroll/unattached-mileage'

export function UnattachedMileageWarning({
  summary,
  runStatus,
}: {
  summary: UnattachedMileageSummary
  runStatus: string
}) {
  if (summary.approvedCount === 0 && summary.draftCount === 0) return null

  const total = (summary.approvedTotal + summary.draftTotal).toFixed(2)
  // Before approval it's still fixable in place; after, the figures are frozen
  // and a separate mileage-only run is the only way to release it.
  const isFrozen = runStatus !== 'draft'

  return (
    <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50/60 p-4">
      <div className="flex items-start gap-3">
        <AlertTriangle size={18} className="text-amber-600 shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-amber-900">
            ${total} of mileage is not in this pay run
          </p>

          <p className="text-sm text-amber-800 mt-1">
            {isFrozen ? (
              <>
                This run&rsquo;s figures are frozen, so the mileage below can&rsquo;t be added to it.
                Release it with a <strong>mileage-only pay run</strong> covering those dates.
              </>
            ) : (
              <>
                Mileage is captured when a run is <strong>created</strong>, not when it&rsquo;s approved.
                {summary.draftCount > 0 && ' Draft mileage is skipped entirely.'}
                {' '}Approve the mileage first, then recreate this run so it picks the mileage up.
              </>
            )}
          </p>

          <ul className="mt-3 space-y-1">
            {summary.entries.map((e) => (
              <li key={e.id} className="flex items-center justify-between gap-3 text-xs text-amber-900">
                <span className="truncate">
                  {e.logDate}
                  {e.contractorName ? ` · ${e.contractorName}` : ''}
                  {e.distanceKm != null ? ` · ${e.distanceKm} km` : ''}
                  {e.status === 'draft' && (
                    <span className="ml-1.5 inline-block px-1.5 py-0.5 rounded bg-amber-200/70 text-amber-900 font-medium">
                      unapproved
                    </span>
                  )}
                </span>
                <span className="font-medium tabular-nums shrink-0">${e.amount.toFixed(2)}</span>
              </li>
            ))}
          </ul>

          <div className="mt-3 flex flex-wrap gap-3 text-xs">
            <Link href="/portal/mileage" className="text-amber-900 underline hover:text-amber-950">
              Review mileage
            </Link>
            {isFrozen && (
              <Link href="/portal/payroll/new" className="text-amber-900 underline hover:text-amber-950">
                Create a mileage-only run
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
