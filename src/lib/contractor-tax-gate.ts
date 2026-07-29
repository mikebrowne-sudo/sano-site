// Per-schedule contractor tax gate (pure, DB-free).
//
// Decides, for EACH service schedule, whether tax is resolved enough to pay —
// combining the schedule's own tax_treatment classification with the contractor's
// current tax declaration. A verified IR330C does NOT make every schedule
// schedular; each schedule is judged on its own classification. PR 4 gates
// payment-readiness only — it computes/deducts nothing.

import { declarationTaxState, type DeclarationRecord } from './contractor-tax-declaration'

export type ScheduleTaxTreatment =
  | 'schedular_payment'
  | 'ordinary_trade_creditor'
  | 'exempt_certificate'
  | 'pending_review'
  | null // unclassified → treated as pending

export interface ScheduleForGate {
  id: string
  name: string
  taxTreatment: ScheduleTaxTreatment
}

export interface ScheduleGateResult {
  scheduleId: string
  name: string
  treatment: ScheduleTaxTreatment
  /** True when this schedule is clear to pay on tax grounds. */
  ok: boolean
  reason: string
}

/**
 * Resolve one schedule's tax gate.
 *  - ordinary_trade_creditor → always OK (not gated by IR330C).
 *  - schedular_payment → requires a verified, current, unexpired declaration
 *    (IR330C/tailored/chosen) OR a verified exemption.
 *  - exempt_certificate → requires a verified, current, unexpired EXEMPTION.
 *  - pending_review / null → blocked (unresolved classification).
 */
export function resolveScheduleGate(
  schedule: ScheduleForGate,
  declaration: DeclarationRecord | null,
  todayIso: string,
): ScheduleGateResult {
  const base = { scheduleId: schedule.id, name: schedule.name, treatment: schedule.taxTreatment }
  const tax = declarationTaxState(declaration, todayIso)

  switch (schedule.taxTreatment) {
    case 'ordinary_trade_creditor':
      return { ...base, ok: true, reason: 'Ordinary trade creditor — not subject to schedular withholding.' }

    case 'schedular_payment':
      if (tax.satisfiesGate) return { ...base, ok: true, reason: tax.reason }
      return { ...base, ok: false, reason: `Payment blocked: valid contractor tax declaration required — ${tax.reason}` }

    case 'exempt_certificate':
      if (tax.satisfiesGate && tax.isExemption) return { ...base, ok: true, reason: 'Verified exemption certificate.' }
      return { ...base, ok: false, reason: 'Payment blocked: a verified, current exemption certificate is required.' }

    case 'pending_review':
    case null:
    default:
      return { ...base, ok: false, reason: 'Payment blocked: this schedule’s tax treatment has not been classified.' }
  }
}

export interface ContractorTaxGateResult {
  /** Per-schedule results. */
  schedules: ScheduleGateResult[]
  /** True only when EVERY schedule is OK — one covered schedule does not make the
   *  contractor universally payment-ready while another is unresolved. */
  allClear: boolean
  /** Schedules currently blocking, for the UI. */
  blocked: ScheduleGateResult[]
}

/** Resolve the gate across all of a contractor's schedules. */
export function resolveContractorTaxGate(
  schedules: ScheduleForGate[],
  declaration: DeclarationRecord | null,
  todayIso: string,
): ContractorTaxGateResult {
  const results = schedules.map((s) => resolveScheduleGate(s, declaration, todayIso))
  const blocked = results.filter((r) => !r.ok)
  return { schedules: results, allClear: blocked.length === 0, blocked }
}
