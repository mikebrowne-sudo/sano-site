// Employee wage-payment lifecycle: draft → approved → paid. These statuses are
// ONLY about paying the employee. Payday filing and IRD remittance are SEPARATE
// state machines — nothing here implies either is done.
//
//   draft     — editable, recalculable, deletable; nothing frozen or owed.
//   approved  — calculation + terms snapshot + deductions frozen; net confirmed;
//               IRD liability becomes eligible; payslip can finalise; not yet paid.
//   paid      — the approved net has been paid to the employee (payment metadata
//               recorded). Figures unchanged. Does NOT imply filed or remitted.
//
// 'completed' is the LEGACY status (old single-step flow) — treated as terminal
// and immutable, never a valid target of a new transition.

export type PayRunPaymentStatus = 'draft' | 'approved' | 'paid'

const ALLOWED: Record<string, PayRunPaymentStatus[]> = {
  draft: ['approved'],
  approved: ['paid'],
  paid: [],
  completed: [], // legacy — no transitions
}

export function canTransitionPayment(from: string | null, to: PayRunPaymentStatus): { ok: boolean; reason?: string } {
  const allowed = ALLOWED[from ?? ''] ?? []
  if (allowed.includes(to)) return { ok: true }
  return { ok: false, reason: `Cannot move a ${from ?? 'unknown'} pay run to ${to}.` }
}

/** Only a draft may be edited or recalculated. */
export function canModifyPayRun(status: string | null): boolean {
  return status === 'draft'
}

/** Approved, paid and legacy-completed runs are frozen. */
export function isImmutable(status: string | null): boolean {
  return status === 'approved' || status === 'paid' || status === 'completed'
}

export interface PaymentDetails {
  paymentDate: string | null
  paymentReference: string | null
  paymentMethod: string | null
}

/** Recording an existing payment requires date, reference and method. */
export function validatePaymentDetails(d: PaymentDetails): { ok: boolean; reason?: string } {
  if (!d.paymentDate) return { ok: false, reason: 'Payment date is required.' }
  if (!d.paymentReference?.trim()) return { ok: false, reason: 'Payment reference is required.' }
  if (!d.paymentMethod?.trim()) return { ok: false, reason: 'Payment method is required.' }
  return { ok: true }
}

/**
 * The DB patch for marking paid — ONLY employee-payment fields. Deliberately
 * carries no payday-filing or IRD-remittance keys, so paying can never imply
 * filing or remittance is done.
 */
export function markPaidPatch(d: PaymentDetails, nowIso: string, userId: string | null): Record<string, unknown> {
  return {
    status: 'paid',
    paid_at: nowIso,
    paid_by: userId,
    payment_date: d.paymentDate,
    payment_reference: d.paymentReference?.trim() ?? null,
    payment_method: d.paymentMethod?.trim() ?? null,
  }
}
