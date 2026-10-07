// Contractor tax remediation — pure finding engine (PR 10, READ-ONLY).
//
// Scans historical contractor financial records and reports what is MISSING or
// UNRESOLVED for tax purposes. It makes NO corrections and creates nothing — the
// caller loads rows read-only and this classifies them. Every finding is one of:
//
//   * 'error'      — a confirmed inconsistency (e.g. a schedular payment paid with
//                    no withholding liability line). Needs a correction.
//   * 'unresolved' — evidence is missing / not yet determinable (e.g. GST status
//                    unresolved on the supply date, or no verified IR330C yet). NOT
//                    proof of an error — it must be reviewed, not auto-corrected.
//
// The error vs unresolved split is deliberate and load-bearing: we NEVER call a
// record wrong when the truth is simply "not yet established". No figure is
// invented and no record is inferred by date/amount.

export type FindingSeverity = 'error' | 'unresolved'

export type FindingCode =
  | 'schedular_payable_missing_snapshot'   // service_schedule_id set, snapshot null
  | 'gst_unresolved'                       // gst_status not settled on the supply date
  | 'withholding_treatment_unresolved'     // contractor schedular treatment not established
  | 'schedular_paid_without_withholding'   // a paid schedular payable with no withholding
  | 'declaration_missing'                  // schedular contractor without a verified IR330C
  | 'liability_line_missing'               // approved schedular snapshot with no active line
  | 'remittance_tax_details_missing'       // tax-bearing payable remitted as amount-only

export interface RemediationFinding {
  code: FindingCode
  severity: FindingSeverity
  /** The primary record the finding is about. */
  entity: 'contractor_invoice' | 'payment_snapshot' | 'remittance_item' | 'contractor'
  entityId: string
  entityRef: string | null        // human ref (CI-####, snapshot #, contractor name)
  contractorId: string | null
  contractorName: string | null
  amount: number | null
  supplyDate: string | null
  /** Plain-language description of what's missing/inconsistent. */
  detail: string
  /** What a human must do — never done automatically. */
  requiredAction: string
}

// ── Inputs (read-only row shapes the caller loads) ───────────────────────────

export interface RemediationInvoice {
  id: string
  invoiceNumber: string | null
  contractorId: string | null
  contractorName: string | null
  amount: number | null
  status: string | null           // pending|approved|paid|void
  ciTaxStatus: string | null      // active|superseded
  paymentType: string | null      // standard|fixed_contract
  serviceScheduleId: string | null
  contractorPaymentSnapshotId: string | null
  gstStatus: string | null        // applied|not_registered|before_effective_date|pending_review|incomplete|not_assessed
  supplyDate: string | null       // gst_supply_date
  /** The contractor's declared tax treatment (from contractors.tax_treatment). */
  contractorTaxTreatment: string | null
  /** True when the contractor has a CURRENT verified IR330C declaration. */
  contractorHasVerifiedDeclaration: boolean
}

export interface RemediationSnapshot {
  id: string
  snapshotNumber: string | null
  contractorId: string | null
  contractorName: string | null
  status: string | null           // draft|approved|superseded|void
  calcStatus: string | null       // ok|...
  taxTreatment: string | null     // schedular_payment|...
  withholdingAmount: number | null
  supplyDate: string | null
  /** True when an ACTIVE contractor_withholding_lines row references this snapshot. */
  hasActiveWithholdingLine: boolean
}

export interface RemediationRemittanceItem {
  id: string
  contractorInvoiceId: string | null
  contractorName: string | null
  amount: number | null
  taxStatus: string | null        // active|superseded
  contractorPaymentSnapshotId: string | null
  /** Whether the source payable is tax-bearing (schedular / has a snapshot). */
  payableIsTaxBearing: boolean
}

// GST statuses that count as SETTLED (no remediation needed).
const GST_SETTLED = new Set(['applied', 'not_registered', 'before_effective_date'])

/** Classify one historical contractor invoice. Returns 0+ findings. */
export function findInvoiceIssues(ci: RemediationInvoice): RemediationFinding[] {
  const out: RemediationFinding[] = []
  // Superseded / void payables are historical records, not live obligations.
  if (ci.ciTaxStatus === 'superseded' || ci.status === 'void') return out

  const base = {
    entity: 'contractor_invoice' as const, entityId: ci.id, entityRef: ci.invoiceNumber,
    contractorId: ci.contractorId, contractorName: ci.contractorName,
    amount: ci.amount ?? null, supplyDate: ci.supplyDate ?? null,
  }
  const isPaid = ci.status === 'paid'
  const isSchedularContractor = ci.contractorTaxTreatment === 'schedular_payment'

  // 1. A schedule-based payable with no snapshot (should be impossible for new
  //    rows post-PR-9; flags any legacy). Confirmed inconsistency → ERROR.
  if (ci.serviceScheduleId && !ci.contractorPaymentSnapshotId) {
    out.push({ ...base, code: 'schedular_payable_missing_snapshot', severity: 'error',
      detail: 'This payable is linked to a service schedule but carries no approved payment tax snapshot.',
      requiredAction: 'Create the approved payment snapshot for this schedule and re-link the payable via a correction (do not edit in place).' })
  }

  // 2. GST not settled on the supply date. pending_review is a data conflict
  //    (leans error); incomplete/not_assessed are genuinely UNRESOLVED.
  if (ci.gstStatus && !GST_SETTLED.has(ci.gstStatus)) {
    const isConflict = ci.gstStatus === 'pending_review'
    out.push({ ...base, code: 'gst_unresolved', severity: isConflict ? 'error' : 'unresolved',
      detail: isConflict
        ? 'GST status is pending review — the contractor is marked not registered yet has a GST effective date on file (a conflict to resolve).'
        : `GST treatment for this payable is unresolved (status: ${ci.gstStatus}). It has not been established whether GST applied on the supply date.`,
      requiredAction: 'Verify the contractor GST registration + effective date for the supply date, then reassess the payable GST.' })
  }

  // 3/4. Schedular contractor obligations.
  if (isSchedularContractor) {
    if (!ci.contractorHasVerifiedDeclaration) {
      // No verified IR330C. If already PAID as schedular → error; else unresolved.
      out.push({ ...base, code: 'declaration_missing', severity: isPaid ? 'error' : 'unresolved',
        detail: isPaid
          ? 'This schedular contractor was paid without a current verified IR330C tax declaration on file.'
          : 'This schedular contractor has no current verified IR330C tax declaration — withholding treatment cannot be established yet.',
        requiredAction: 'Obtain + verify the contractor IR330C declaration (rate / exemption) before any schedular payment.' })
    }
    if (!ci.contractorPaymentSnapshotId) {
      // A schedular contractor's payable with no snapshot = no withholding computed.
      if (isPaid) {
        out.push({ ...base, code: 'schedular_paid_without_withholding', severity: 'error',
          detail: 'A schedular contractor was paid on this invoice with no payment tax snapshot, so no schedular withholding was computed or retained.',
          requiredAction: 'Review the payment: determine the withholding that should have applied and remediate with IRD manually. Do not auto-adjust.' })
      } else {
        out.push({ ...base, code: 'withholding_treatment_unresolved', severity: 'unresolved',
          detail: 'This schedular contractor payable has no payment tax snapshot, so withholding treatment is not yet established.',
          requiredAction: 'Price the payable through an approved payment snapshot before approval/payment.' })
      }
    }
  }

  return out
}

/** Classify one approved snapshot — a schedular one must have an active liability line. */
export function findSnapshotIssues(s: RemediationSnapshot): RemediationFinding[] {
  if (s.status !== 'approved') return []
  if (s.taxTreatment !== 'schedular_payment') return []
  if (!((s.withholdingAmount ?? 0) > 0)) return []
  if (s.hasActiveWithholdingLine) return []
  return [{
    entity: 'payment_snapshot', entityId: s.id, entityRef: s.snapshotNumber,
    contractorId: s.contractorId, contractorName: s.contractorName,
    amount: s.withholdingAmount ?? null, supplyDate: s.supplyDate ?? null,
    code: 'liability_line_missing', severity: 'error',
    detail: 'An approved schedular payment snapshot with withholding has no active contractor withholding liability line.',
    requiredAction: 'Create the withholding liability line from this approved snapshot so the IRD amount is accounted for.',
  }]
}

/** Classify one active remittance item — a tax-bearing payable must carry frozen tax. */
export function findRemittanceItemIssues(it: RemediationRemittanceItem): RemediationFinding[] {
  if (it.taxStatus === 'superseded') return []
  if (!it.payableIsTaxBearing) return []
  if (it.contractorPaymentSnapshotId) return []
  return [{
    entity: 'remittance_item', entityId: it.id, entityRef: null,
    contractorId: null, contractorName: it.contractorName,
    amount: it.amount ?? null, supplyDate: null,
    code: 'remittance_tax_details_missing', severity: 'error',
    detail: 'A tax-bearing (schedular) payable was remitted as an ordinary amount-only line — the frozen gross/GST/withholding/net breakdown is missing.',
    requiredAction: 'Re-issue the remittance from the approved snapshot so the tax breakdown is frozen onto the line (supersede the current item).',
  }]
}

export interface RemediationReport {
  findings: RemediationFinding[]
  summary: {
    total: number
    errors: number
    unresolved: number
    byCode: Record<string, number>
  }
}

/** Build the full report from the loaded record sets. Pure — no I/O. */
export function buildRemediationReport(input: {
  invoices: RemediationInvoice[]
  snapshots: RemediationSnapshot[]
  remittanceItems: RemediationRemittanceItem[]
}): RemediationReport {
  const findings = [
    ...input.invoices.flatMap(findInvoiceIssues),
    ...input.snapshots.flatMap(findSnapshotIssues),
    ...input.remittanceItems.flatMap(findRemittanceItemIssues),
  ]
  // Errors first, then unresolved; stable within each by code.
  findings.sort((a, b) => {
    if (a.severity !== b.severity) return a.severity === 'error' ? -1 : 1
    return a.code.localeCompare(b.code)
  })
  const byCode: Record<string, number> = {}
  for (const f of findings) byCode[f.code] = (byCode[f.code] ?? 0) + 1
  return {
    findings,
    summary: {
      total: findings.length,
      errors: findings.filter((f) => f.severity === 'error').length,
      unresolved: findings.filter((f) => f.severity === 'unresolved').length,
      byCode,
    },
  }
}
