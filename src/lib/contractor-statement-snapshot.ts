// The immutable issued snapshot — the exact contractor-facing statement as it
// was at issue. Written once by the issue action; never rewritten. Contractor
// views (issued/superseded/confirmed/paid) render from this, NOT from live
// jobs/CIs, so what the contractor saw can never change under them.
//
// Contains ONLY contractor-facing data: no client price, margin, internal notes
// or any other contractor's information.

import { GST_CONFIRMED_STATUS, isCarriedForward, isGstReviewRequired } from './contractor-statement-build'

// ── Supplier identity ────────────────────────────────────────────────────────
// Display + snapshot priority: verified legal_name → company_name (where the
// contractor trades through an entity) → full_name. Issue is NEVER blocked on
// pending verification; we use the best current name and record that it was
// unverified. `supplier_identity_verified` currently keys off tax_review_status
// (the closest existing verification signal) — a dedicated flag can replace it.

export interface SupplierIdentityInput {
  full_name: string | null
  legal_name: string | null
  company_name: string | null
  business_structure: string | null
  tax_review_status: string | null
}

export type SupplierNameSource = 'legal_name' | 'company_name' | 'full_name'

export interface ResolvedSupplier {
  supplier_name: string
  contractor_contact_name: string
  supplier_name_source: SupplierNameSource
  supplier_identity_verified: boolean
}

const ENTITY_STRUCTURES = new Set(['company', 'partnership', 'trust'])

export function resolveSupplierIdentity(c: SupplierIdentityInput): ResolvedSupplier {
  const contact = (c.full_name ?? '').trim() || 'Unknown contractor'
  const legal = (c.legal_name ?? '').trim()
  const company = (c.company_name ?? '').trim()
  const tradesThroughEntity = ENTITY_STRUCTURES.has(c.business_structure ?? '')

  let supplier_name: string
  let source: SupplierNameSource
  if (legal) { supplier_name = legal; source = 'legal_name' }
  else if (company && tradesThroughEntity) { supplier_name = company; source = 'company_name' }
  else { supplier_name = contact; source = 'full_name' }

  // Verified only when we used the legal name AND identity review is complete.
  const supplier_identity_verified = source === 'legal_name' && c.tax_review_status === 'complete'
  return { supplier_name, contractor_contact_name: contact, supplier_name_source: source, supplier_identity_verified }
}

// ── Issued snapshot ──────────────────────────────────────────────────────────

export interface SnapshotLineInput {
  contractor_invoice_id: string
  invoice_number: string | null
  job_number: string | null
  service_date: string | null
  description: string | null
  site: string | null
  hours: number | null
  rate: number | null
  pay_basis: string | null
  amount: number
  gst_status: string | null
  gst_amount: number | null
  // Frozen schedular tax breakdown (PR 9) — populated only when the payable
  // carried an explicit approved snapshot id; null on ordinary/non-schedular
  // lines. Copied from the snapshot, never recomputed. gst_amount_frozen is the
  // snapshot's authoritative GST (kept separate from the display `gst_amount`).
  contractor_payment_snapshot_id?: string | null
  gross_ex_gst?: number | null
  gst_amount_frozen?: number | null
  wht_rate?: number | null
  wht_amount?: number | null
  net_paid?: number | null
  tax_declaration_id?: string | null
}

export interface SnapshotLine extends SnapshotLineInput {
  gst_amount: number | null // present (>0) only when gst_status = 'applied'
  carried_forward: boolean
}

export interface IssuedSnapshot {
  snapshot_version: 1
  statement_number: string
  contractor_id: string
  contractor_name: string
  supplier_name: string
  contractor_contact_name: string
  supplier_name_source: SupplierNameSource
  supplier_identity_verified: boolean
  period_start: string
  period_end: string
  issued_at: string
  review_due_at: string
  lines: SnapshotLine[]
  subtotal: number
  gst_total: number
  total_payable: number
  gst_review_count: number
  // Frozen schedular totals (PR 9) — the withholding retained to IRD across lines
  // that carried an approved snapshot. 0 when no line is schedular.
  wht_total: number
}

export interface BuildSnapshotInput {
  statement_number: string
  contractor_id: string
  supplier: ResolvedSupplier
  period_start: string
  period_end: string
  issued_at: string
  review_due_at: string
  lines: SnapshotLineInput[]
}

const round2 = (n: number) => Math.round(n * 100) / 100

export function buildIssuedSnapshot(input: BuildSnapshotInput): IssuedSnapshot {
  const lines: SnapshotLine[] = input.lines
    .map((l) => ({
      ...l,
      // Only a confirmed 'applied' line carries a GST amount; flagged rows show null.
      gst_amount: l.gst_status === GST_CONFIRMED_STATUS ? l.gst_amount : null,
      carried_forward: l.service_date != null && isCarriedForward(l.service_date, input.period_start),
    }))
    .sort((a, b) => (a.service_date ?? '').localeCompare(b.service_date ?? ''))

  const subtotal = round2(lines.reduce((s, l) => s + l.amount, 0))
  const gst_total = round2(
    lines.reduce((s, l) => (l.gst_status === GST_CONFIRMED_STATUS ? s + (l.gst_amount ?? 0) : s), 0),
  )
  const wht_total = round2(lines.reduce((s, l) => s + (l.wht_amount ?? 0), 0))

  return {
    snapshot_version: 1,
    statement_number: input.statement_number,
    contractor_id: input.contractor_id,
    contractor_name: input.supplier.supplier_name,
    supplier_name: input.supplier.supplier_name,
    contractor_contact_name: input.supplier.contractor_contact_name,
    supplier_name_source: input.supplier.supplier_name_source,
    supplier_identity_verified: input.supplier.supplier_identity_verified,
    period_start: input.period_start,
    period_end: input.period_end,
    issued_at: input.issued_at,
    review_due_at: input.review_due_at,
    lines,
    subtotal,
    gst_total,
    total_payable: subtotal,
    gst_review_count: lines.filter((l) => isGstReviewRequired(l.gst_status)).length,
    wht_total,
  }
}
