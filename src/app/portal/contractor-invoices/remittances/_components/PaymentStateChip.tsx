// Payment state chip — the Paid vs Bank confirmed distinction, made visible.
//
// These are DIFFERENT facts and must never be collapsed:
//   paid_at           = staff recorded the payment
//   payment_confirmed = matched to real outgoing bank money (reconcile-out)
//
// "Paid, awaiting bank" is a normal workflow state, not an error — it is styled
// calmly (sage/neutral), never red. Only a long-unreconciled age gets a gentle
// amber nudge, and even then it is informational.

import { CheckCircle2, Clock, Landmark, CircleDashed } from 'lucide-react'
import clsx from 'clsx'
import { formatCurrency } from '@/lib/format'
import type { PaymentState } from '@/lib/contractor-remittance-data'

export const STATE_LABEL: Record<PaymentState, string> = {
  open: 'Open',
  paid: 'Paid',
  partial: 'Partly confirmed',
  confirmed: 'Bank confirmed',
}

/** Days a remittance can sit paid-but-unreconciled before a gentle nudge. */
export const STALE_AFTER_DAYS = 45

export function daysSince(iso: string | null): number | null {
  if (!iso) return null
  const then = new Date(iso).getTime()
  if (Number.isNaN(then)) return null
  return Math.floor((Date.now() - then) / 86_400_000)
}

export function PaymentStateChip({
  state, allocatedTotal, total, className,
}: {
  state: PaymentState
  allocatedTotal?: number
  total?: number
  className?: string
}) {
  const base = 'inline-flex items-center gap-1.5 text-[11px] px-2 py-0.5 rounded-full font-medium whitespace-nowrap'

  if (state === 'confirmed') {
    return <span className={clsx(base, 'bg-emerald-50 text-emerald-700', className)}><Landmark size={12} /> Bank confirmed</span>
  }
  if (state === 'partial') {
    return (
      <span
        className={clsx(base, 'bg-amber-50 text-amber-800', className)}
        title={total != null ? `${formatCurrency(allocatedTotal ?? 0)} of ${formatCurrency(total)} matched to the bank` : undefined}
      >
        <CircleDashed size={12} /> Partly confirmed
        {total != null && allocatedTotal != null && (
          <span className="font-normal">· {formatCurrency(allocatedTotal)} of {formatCurrency(total)}</span>
        )}
      </span>
    )
  }
  if (state === 'paid') {
    // Deliberately calm: awaiting reconciliation is expected, not a failure.
    return <span className={clsx(base, 'bg-sage-100 text-sage-700', className)}><CheckCircle2 size={12} /> Paid</span>
  }
  return <span className={clsx(base, 'bg-gray-100 text-gray-500', className)}><Clock size={12} /> Open</span>
}
