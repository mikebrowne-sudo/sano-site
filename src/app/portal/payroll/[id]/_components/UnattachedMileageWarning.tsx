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
import { AddMileageToRunButton } from './AddMileageToRunButton'

export function UnattachedMileageWarning({
  summary,
  runStatus,
  payRunId,
}: {
  summary: UnattachedMileageSummary
  runStatus: string
  payRunId: string
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
                It will be picked up automatically by the next pay run.
              </>
            ) : summary.draftCount > 0 ? (
              <>
                <strong>{summary.draftCount} {summary.draftCount === 1 ? 'trip is' : 'trips are'} still unapproved</strong>{' '}
                and will be left out of this pay run. Check and approve them first, then add them here.
              </>
            ) : (
              <>Add it to this pay run before approving, so it&rsquo;s paid with these wages.</>
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

          <div className="mt-3 flex flex-wrap items-center gap-3 text-xs">
            {!isFrozen && summary.approvedCount > 0 && (
              <AddMileageToRunButton payRunId={payRunId} />
            )}
            <Link href="/portal/mileage" className="text-amber-900 underline hover:text-amber-950">
              {summary.draftCount > 0 ? 'Check and approve mileage' : 'Review mileage'}
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
