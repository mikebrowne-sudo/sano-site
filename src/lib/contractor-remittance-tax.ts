// Contractor remittance/statement tax snapshot resolver (PR 9) — pure helpers.
//
// A remittance/statement line may carry the frozen tax breakdown copied from an
// APPROVED contractor_payment_tax_snapshots row (PR 7): gross ex GST, GST,
// withholding rate + amount, net paid, the tax declaration used, and supply date.
//
// EXPLICIT ID ONLY. The snapshot is identified by the id the payable
// (contractor_invoices.contractor_payment_snapshot_id) already carries — set when
// the schedular/tax-bearing payable was priced from an approved snapshot. There is
// NO (contractor_id, supply_date) lookup: a same-day pair of payments is
// disambiguated purely by their explicit ids. A payable with no snapshot id is an
// ordinary amount-only line. Figures are COPIED, never recomputed.

/** An approved snapshot row, loaded by its explicit id, as needed to freeze. */
export interface ApprovedSnapshotForRemittance {
  id: string
  contractorId: string
  status: string          // must be 'approved'
  calcStatus: string      // must be 'ok'
  serviceScheduleId: string | null
  supplyDate: string      // YYYY-MM-DD
  grossExGst: number | null
  gstAmount: number | null
  withholdingRate: number | null
  withholdingAmount: number | null
  netBank: number | null
  taxDeclarationId: string | null
}

/** The payable being remitted, with its explicit snapshot link. */
export interface PayableForRemittance {
  contractorId: string | null
  serviceScheduleId: string | null
  /** The explicit snapshot id on the payable — null for ordinary payables. */
  contractorPaymentSnapshotId: string | null
}

/** The frozen tax figures written onto a remittance item / snapshot line. */
export interface FrozenLineTax {
  contractor_payment_snapshot_id: string
  gross_ex_gst: number | null
  gst_amount: number | null
  wht_rate: number | null
  wht_amount: number | null
  net_paid: number | null
  tax_declaration_id: string | null
  supply_date: string
}

export type ResolveTaxResult =
  | { kind: 'none' }                              // ordinary payable — amount-only line
  | { kind: 'frozen'; tax: FrozenLineTax }        // explicit snapshot resolved + valid
  | { kind: 'error'; reason: string }             // an explicit id was given but is invalid → BLOCK

/**
 * Resolve the frozen tax for a payable from its EXPLICIT snapshot id.
 *
 * - Payable has no snapshot id → 'none' (ordinary amount-only line).
 * - Payable has a snapshot id and it loads as approved/ok/same-contractor/
 *   same-schedule → 'frozen' with the copied figures.
 * - Payable has a snapshot id that is missing, not approved, superseded/void,
 *   the wrong contractor, or the wrong schedule → 'error' (the caller BLOCKS the
 *   remittance rather than paying a tax-bearing line with a bad/absent snapshot).
 *
 * `approvedSnapshotsById` is the caller's map of the explicit ids it loaded.
 */
export function resolveRemittanceLineTax(
  payable: PayableForRemittance,
  approvedSnapshotsById: Map<string, ApprovedSnapshotForRemittance>,
): ResolveTaxResult {
  const id = payable.contractorPaymentSnapshotId
  if (!id) return { kind: 'none' }

  const s = approvedSnapshotsById.get(id)
  if (!s) return { kind: 'error', reason: `payment snapshot ${id} does not exist or is not approved` }
  if (s.status !== 'approved' || s.calcStatus !== 'ok') {
    return { kind: 'error', reason: `payment snapshot ${id} is not an approved, ok snapshot (status=${s.status}, calc=${s.calcStatus})` }
  }
  if (payable.contractorId && s.contractorId !== payable.contractorId) {
    return { kind: 'error', reason: `payment snapshot ${id} belongs to a different contractor` }
  }
  if (s.serviceScheduleId && payable.serviceScheduleId && s.serviceScheduleId !== payable.serviceScheduleId) {
    return { kind: 'error', reason: `payment snapshot ${id} is for a different service schedule` }
  }
  return {
    kind: 'frozen',
    tax: {
      contractor_payment_snapshot_id: s.id,
      gross_ex_gst: s.grossExGst,
      gst_amount: s.gstAmount,
      wht_rate: s.withholdingRate,
      wht_amount: s.withholdingAmount,
      net_paid: s.netBank,
      tax_declaration_id: s.taxDeclarationId,
      supply_date: s.supplyDate,
    },
  }
}

/** True when a line carries a full frozen tax breakdown (has a snapshot ref). */
export function hasFrozenTax(line: { contractor_payment_snapshot_id?: string | null }): boolean {
  return line.contractor_payment_snapshot_id != null
}

/**
 * Validate that an explicit snapshot may be LINKED to a payable being created
 * (approve/create time). Shared source-of-truth check used by every path that
 * sets contractor_invoices.contractor_payment_snapshot_id, so the rules can't
 * drift. Returns an error string, or null when the link is valid. Never infers a
 * snapshot — the id is supplied explicitly.
 *
 * `alreadyActiveSnapshotIds` is the set of snapshot ids already carried by an
 * ACTIVE (non-superseded) payable — a snapshot can't back a second active
 * payable unless this is an explicit correction (isCorrection = true).
 */
export function validateSnapshotForPayable(args: {
  snapshot: ApprovedSnapshotForRemittance | null | undefined
  contractorId: string
  serviceScheduleId: string | null
  alreadyActiveSnapshotIds?: Set<string>
  isCorrection?: boolean
}): string | null {
  const { snapshot: s, contractorId, serviceScheduleId } = args
  if (!s) return 'The referenced payment snapshot does not exist.'
  if (s.status !== 'approved') return `The payment snapshot is not approved (status: ${s.status}).`
  if (s.calcStatus !== 'ok') return `The payment snapshot calculation is not resolved (calc_status: ${s.calcStatus}).`
  if (s.contractorId !== contractorId) return 'The payment snapshot belongs to a different contractor.'
  if (s.serviceScheduleId && serviceScheduleId && s.serviceScheduleId !== serviceScheduleId) {
    return 'The payment snapshot is for a different service schedule.'
  }
  if (!args.isCorrection && args.alreadyActiveSnapshotIds?.has(s.id)) {
    return 'This payment snapshot is already linked to another active payable.'
  }
  return null
}
