// Phase G.2 step 3 — Ready-to-invoice panel for /portal/jobs/[id].
//
// Signal-not-gate. Surfaces job cleanup issues that may affect
// invoicing, contractor pay, or reporting. Does NOT block
// createInvoiceFromJob or any existing conversion flow — the Phase D
// job_settings gates remain authoritative.
//
// Severity vocabulary matches the /portal/finance Jobs needing
// attention widget so admin sees the same labels everywhere:
//   hard    → "Needs fixing"
//   warning → "Check"
//   info    → "Info"
// The underlying ReconciliationFlag severity values are unchanged.
//
// Data is computed on the server inside the job page using
// reconcileJob (src/lib/job-reconciliation.ts) and handed in as a
// flat flag list + severity counts.

import Link from 'next/link'
import clsx from 'clsx'
import type { ReconciliationFlag } from '@/lib/job-reconciliation'

// Local copy of the severity styling vocabulary used by the finance
// widget. Kept inline here rather than extracted to a shared module
// so this PR stays narrowly scoped to the job page. A small dedupe
// pass can extract these to /portal/_components/ReconciliationDisplay
// in a later follow-up if a third surface needs them.
const SEVERITY_STYLES: Record<ReconciliationFlag['severity'], string> = {
  hard:    'bg-red-50 text-red-700',
  warning: 'bg-amber-50 text-amber-700',
  info:    'bg-sage-50 text-sage-700',
}
const SEVERITY_LABELS: Record<ReconciliationFlag['severity'], string> = {
  hard:    'Needs fixing',
  warning: 'Check',
  info:    'Info',
}

export interface JobReadyToInvoiceProps {
  flags: ReconciliationFlag[]
  severityCounts: { hard: number; warning: number; info: number }
}

export function JobReadyToInvoice({ flags, severityCounts }: JobReadyToInvoiceProps) {
  const hasIssues = flags.length > 0

  return (
    <section>
      <h2 className="text-lg font-semibold text-sage-800 mb-1">Ready to invoice</h2>
      <p className="text-sm text-sage-500">
        Checks that may affect invoicing, contractor pay, or reporting.
        These are guidance only and do not block invoicing.
      </p>

      {!hasIssues ? (
        <p className="text-sm text-emerald-700 mt-3">
          ✓ No finance cleanup issues found for this job.
        </p>
      ) : (
        <>
          <p className="text-sm text-sage-600 mt-2">
            <span className="text-red-700 font-medium">{severityCounts.hard}</span> need fixing
            {' · '}
            <span className="text-amber-700 font-medium">{severityCounts.warning}</span> to check
            {' · '}
            <span className="text-sage-700 font-medium">{severityCounts.info}</span> info
          </p>
          <ul className="mt-4 space-y-2">
            {flags.map((f) => (
              <li
                key={f.flag}
                className="flex flex-wrap items-start gap-x-3 gap-y-1 text-sm border-b border-gray-50 pb-2 last:border-b-0"
              >
                <span
                  className={clsx(
                    'inline-block px-2.5 py-0.5 rounded-full text-xs font-medium whitespace-nowrap mt-0.5',
                    SEVERITY_STYLES[f.severity],
                  )}
                >
                  {SEVERITY_LABELS[f.severity]}
                </span>
                <span className="flex-1 min-w-0 text-sage-700">{f.message}</span>
                {f.suggestedAction && (
                  f.href ? (
                    <Link
                      href={f.href}
                      className="text-sage-600 hover:text-sage-800 text-sm whitespace-nowrap"
                    >
                      {f.suggestedAction} →
                    </Link>
                  ) : (
                    <span className="text-sage-500 text-sm whitespace-nowrap">
                      {f.suggestedAction}
                    </span>
                  )
                )}
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  )
}
