// Contractor remittance/statement tax snapshot resolver (PR 9) — pure helpers.
//
// A remittance line (or statement snapshot line) may carry the frozen tax
// breakdown copied from an APPROVED contractor_payment_tax_snapshots row (PR 7):
// gross ex GST, GST, withholding rate + amount, net paid, the tax declaration
// used, and the supply date. There is no invoice→snapshot FK, so the match key is
// (contractor_id, supply_date) among approved snapshots.
//
// STRICT: figures are COPIED, never recomputed. If exactly one approved snapshot
// matches, freeze it. If none match (the ordinary/non-schedular case), the line
// stays amount-only (all tax fields null). If MORE than one approved snapshot
// matches the same contractor + supply_date, it is ambiguous — we DO NOT guess;
// the line stays unfrozen and the ambiguity is reported. No number is invented.

/** An approved snapshot row as needed to freeze a remittance/statement line. */
export interface ApprovedSnapshotForRemittance {
  id: string
  contractorId: string
  status: string          // must be 'approved'
  calcStatus: string      // must be 'ok'
  supplyDate: string      // YYYY-MM-DD
  grossExGst: number | null
  gstAmount: number | null
  withholdingRate: number | null
  withholdingAmount: number | null
  netBank: number | null
  taxDeclarationId: string | null
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
  | { kind: 'none' }                                   // no approved snapshot — amount-only line
  | { kind: 'frozen'; tax: FrozenLineTax }             // exactly one match — freeze it
  | { kind: 'ambiguous'; snapshotIds: string[] }       // >1 approved match — never guess

/**
 * Resolve the frozen tax for a contractor + supply date from the set of that
 * contractor's approved snapshots. Only 'approved' + calc 'ok' snapshots are
 * eligible. Returns 'none' / 'frozen' / 'ambiguous' — the caller writes tax only
 * on 'frozen'.
 */
export function resolveRemittanceLineTax(
  contractorId: string | null,
  supplyDate: string | null,
  approvedSnapshots: ApprovedSnapshotForRemittance[],
): ResolveTaxResult {
  if (!contractorId || !supplyDate) return { kind: 'none' }
  const matches = approvedSnapshots.filter(
    (s) => s.status === 'approved' && s.calcStatus === 'ok'
      && s.contractorId === contractorId && s.supplyDate === supplyDate,
  )
  if (matches.length === 0) return { kind: 'none' }
  if (matches.length > 1) return { kind: 'ambiguous', snapshotIds: matches.map((m) => m.id) }
  const s = matches[0]
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
