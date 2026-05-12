// Phase 5B — invoice-existence lock banner.
//
// Shown on the quote/job detail page when an invoice has been created
// on the chain. Replaces the edit affordance for normal staff;
// supplements it for admins (with an `<AmendmentOverrideButton>` slot
// that triggers the override flow).
//
// Server component, pure presentational.

import Link from 'next/link'
import { Lock } from 'lucide-react'

export interface LockBannerProps {
  invoiceNumber: string
  invoiceHref: string
  /** Optional admin-only override slot — typically an
   *  <AmendmentOverrideButton>. Renders to the right of the message. */
  override?: React.ReactNode
}

export function LockBanner({ invoiceNumber, invoiceHref, override }: LockBannerProps) {
  return (
    <section className="rounded-xl border border-sage-100 bg-sage-50 p-4 mb-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0">
          <Lock size={18} className="text-sage-600 shrink-0 mt-0.5" aria-hidden="true" />
          <div className="min-w-0">
            <p className="text-sm text-sage-800 font-medium">
              Locked by{' '}
              <Link href={invoiceHref} className="text-sage-700 hover:underline">{invoiceNumber}</Link>.
            </p>
            <p className="text-xs text-sage-600 mt-0.5">
              Material edits (pricing, scope, line items) require admin override.
              Operational fields like schedule, contractor, and notes stay editable.
            </p>
          </div>
        </div>
        {override && <div className="shrink-0">{override}</div>}
      </div>
    </section>
  )
}
