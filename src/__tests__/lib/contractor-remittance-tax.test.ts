import { readFileSync } from 'fs'
import { join } from 'path'
import { resolveRemittanceLineTax, hasFrozenTax, validateSnapshotForPayable, type ApprovedSnapshotForRemittance, type PayableForRemittance } from '@/lib/contractor-remittance-tax'
import { buildIssuedSnapshot, resolveSupplierIdentity } from '@/lib/contractor-statement-snapshot'

const snap = (over: Partial<ApprovedSnapshotForRemittance> = {}): ApprovedSnapshotForRemittance => ({
  id: 's1', contractorId: 'c1', status: 'approved', calcStatus: 'ok', serviceScheduleId: 'sch1',
  supplyDate: '2026-08-15', grossExGst: 1875, gstAmount: 0, withholdingRate: 0.20,
  withholdingAmount: 375, netBank: 1500, taxDeclarationId: 'decl1', ...over,
})
const mapOf = (...s: ApprovedSnapshotForRemittance[]) => new Map(s.map((x) => [x.id, x]))
const payable = (over: Partial<PayableForRemittance> = {}): PayableForRemittance => ({
  contractorId: 'c1', serviceScheduleId: 'sch1', contractorPaymentSnapshotId: 's1', ...over,
})

describe('resolveRemittanceLineTax — EXPLICIT snapshot id only (no supply-date lookup)', () => {
  it('returns none when the payable carries no snapshot id (ordinary line)', () => {
    expect(resolveRemittanceLineTax(payable({ contractorPaymentSnapshotId: null }), mapOf(snap()))).toEqual({ kind: 'none' })
  })

  it('freezes the exact figures for the explicitly-linked approved snapshot (Myrtle-shaped)', () => {
    expect(resolveRemittanceLineTax(payable(), mapOf(snap()))).toEqual({
      kind: 'frozen',
      tax: {
        contractor_payment_snapshot_id: 's1',
        gross_ex_gst: 1875, gst_amount: 0, wht_rate: 0.20, wht_amount: 375, net_paid: 1500,
        tax_declaration_id: 'decl1', supply_date: '2026-08-15',
      },
    })
  })

  it('BLOCKS (error) when the explicit snapshot id does not resolve', () => {
    const r = resolveRemittanceLineTax(payable({ contractorPaymentSnapshotId: 'missing' }), mapOf(snap()))
    expect(r.kind).toBe('error')
    if (r.kind === 'error') expect(r.reason).toMatch(/does not exist or is not approved/)
  })

  it('BLOCKS an unapproved / blocked / superseded / void snapshot', () => {
    for (const bad of ['draft', 'superseded', 'void'] as const) {
      const r = resolveRemittanceLineTax(payable(), mapOf(snap({ status: bad })))
      expect(r.kind).toBe('error')
    }
    const r = resolveRemittanceLineTax(payable(), mapOf(snap({ calcStatus: 'blocked' })))
    expect(r.kind).toBe('error')
  })

  it('BLOCKS the wrong contractor’s snapshot', () => {
    const r = resolveRemittanceLineTax(payable({ contractorId: 'c2' }), mapOf(snap()))
    expect(r.kind).toBe('error')
    if (r.kind === 'error') expect(r.reason).toMatch(/different contractor/)
  })

  it('BLOCKS a snapshot for a different service schedule', () => {
    const r = resolveRemittanceLineTax(payable({ serviceScheduleId: 'schX' }), mapOf(snap()))
    expect(r.kind).toBe('error')
    if (r.kind === 'error') expect(r.reason).toMatch(/different service schedule/)
  })

  it('supports ambiguous SAME-DAY payments via distinct explicit ids', () => {
    // Two snapshots, same contractor + same supply date, distinguished ONLY by id.
    const a = snap({ id: 'a', serviceScheduleId: 'schA' })
    const b = snap({ id: 'b', serviceScheduleId: 'schB', withholdingAmount: 500, netBank: 2000, grossExGst: 2500 })
    const m = mapOf(a, b)
    const ra = resolveRemittanceLineTax(payable({ serviceScheduleId: 'schA', contractorPaymentSnapshotId: 'a' }), m)
    const rb = resolveRemittanceLineTax(payable({ serviceScheduleId: 'schB', contractorPaymentSnapshotId: 'b' }), m)
    expect(ra.kind).toBe('frozen'); expect(rb.kind).toBe('frozen')
    if (ra.kind === 'frozen') expect(ra.tax.wht_amount).toBe(375)
    if (rb.kind === 'frozen') expect(rb.tax.wht_amount).toBe(500)
  })

  it('copies figures verbatim — does not recompute net from gross/wht', () => {
    const r = resolveRemittanceLineTax(payable(), mapOf(snap({ netBank: 9999 })))
    expect(r.kind).toBe('frozen')
    if (r.kind === 'frozen') expect(r.tax.net_paid).toBe(9999)
  })

  it('hasFrozenTax reflects the snapshot ref', () => {
    expect(hasFrozenTax({ contractor_payment_snapshot_id: 's1' })).toBe(true)
    expect(hasFrozenTax({ contractor_payment_snapshot_id: null })).toBe(false)
    expect(hasFrozenTax({})).toBe(false)
  })
})

describe('validateSnapshotForPayable — link-time source checks (approve/create)', () => {
  const base = () => snap()
  it('accepts a valid approved snapshot for the same contractor + schedule', () => {
    expect(validateSnapshotForPayable({ snapshot: base(), contractorId: 'c1', serviceScheduleId: 'sch1' })).toBeNull()
  })
  it('rejects a missing snapshot', () => {
    expect(validateSnapshotForPayable({ snapshot: null, contractorId: 'c1', serviceScheduleId: 'sch1' })).toMatch(/does not exist/)
  })
  it('rejects unapproved / not-ok / superseded / void', () => {
    expect(validateSnapshotForPayable({ snapshot: snap({ status: 'draft' }), contractorId: 'c1', serviceScheduleId: 'sch1' })).toMatch(/not approved/)
    expect(validateSnapshotForPayable({ snapshot: snap({ calcStatus: 'blocked' }), contractorId: 'c1', serviceScheduleId: 'sch1' })).toMatch(/not resolved/)
    expect(validateSnapshotForPayable({ snapshot: snap({ status: 'superseded' }), contractorId: 'c1', serviceScheduleId: 'sch1' })).toMatch(/not approved/)
    expect(validateSnapshotForPayable({ snapshot: snap({ status: 'void' }), contractorId: 'c1', serviceScheduleId: 'sch1' })).toMatch(/not approved/)
  })
  it('rejects the wrong contractor / wrong schedule', () => {
    expect(validateSnapshotForPayable({ snapshot: base(), contractorId: 'cX', serviceScheduleId: 'sch1' })).toMatch(/different contractor/)
    expect(validateSnapshotForPayable({ snapshot: base(), contractorId: 'c1', serviceScheduleId: 'schX' })).toMatch(/different service schedule/)
  })
  it('rejects a snapshot already on another ACTIVE payable, unless a correction', () => {
    const active = new Set(['s1'])
    expect(validateSnapshotForPayable({ snapshot: base(), contractorId: 'c1', serviceScheduleId: 'sch1', alreadyActiveSnapshotIds: active })).toMatch(/already linked to another active payable/)
    expect(validateSnapshotForPayable({ snapshot: base(), contractorId: 'c1', serviceScheduleId: 'sch1', alreadyActiveSnapshotIds: active, isCorrection: true })).toBeNull()
  })
})

describe('END-TO-END fixture: approved snapshot → payable → remittance → issued statement', () => {
  // 1. An approved schedular payment snapshot (Myrtle-shaped, GST-exclusive net).
  const approved = snap({ id: 'snap-A', contractorId: 'myrtle', serviceScheduleId: 'sch-golf',
    supplyDate: '2026-08-31', grossExGst: 1875, gstAmount: 0, withholdingRate: 0.20, withholdingAmount: 375, netBank: 1500, taxDeclarationId: 'decl-A' })
  const byId = mapOf(approved)

  it('2–3. the payable links the explicit snapshot; link-time validation passes', () => {
    expect(validateSnapshotForPayable({ snapshot: approved, contractorId: 'myrtle', serviceScheduleId: 'sch-golf' })).toBeNull()
  })

  it('4. the remittance copies the EXACT frozen figures (no recompute)', () => {
    const r = resolveRemittanceLineTax(
      { contractorId: 'myrtle', serviceScheduleId: 'sch-golf', contractorPaymentSnapshotId: 'snap-A' }, byId)
    expect(r.kind).toBe('frozen')
    if (r.kind === 'frozen') {
      expect(r.tax).toEqual({
        contractor_payment_snapshot_id: 'snap-A', gross_ex_gst: 1875, gst_amount: 0,
        wht_rate: 0.20, wht_amount: 375, net_paid: 1500, tax_declaration_id: 'decl-A', supply_date: '2026-08-31',
      })
    }
  })

  it('5–6. the issued statement displays gross/GST/withholding/net and keeps the links', () => {
    const r = resolveRemittanceLineTax(
      { contractorId: 'myrtle', serviceScheduleId: 'sch-golf', contractorPaymentSnapshotId: 'snap-A' }, byId)
    const tax = r.kind === 'frozen' ? r.tax : null
    const snapshot = buildIssuedSnapshot({
      statement_number: 'STMT-9001', contractor_id: 'myrtle',
      supplier: resolveSupplierIdentity({ full_name: 'Myrtle', legal_name: null, company_name: null, business_structure: 'sole_trader', tax_review_status: null }),
      period_start: '2026-08-01', period_end: '2026-08-31', issued_at: '2026-09-01T00:00:00Z', review_due_at: '2026-09-06T00:00:00Z',
      lines: [{
        contractor_invoice_id: 'ci-A', invoice_number: 'CI-9001', job_number: null, service_date: '2026-08-31',
        description: 'Pukekohe Golf Club', site: 'Pukekohe', hours: null, rate: null, pay_basis: 'guaranteed_net',
        amount: 1875, gst_status: 'not_assessed', gst_amount: null,
        contractor_payment_snapshot_id: tax!.contractor_payment_snapshot_id, gross_ex_gst: tax!.gross_ex_gst,
        gst_amount_frozen: tax!.gst_amount, wht_rate: tax!.wht_rate, wht_amount: tax!.wht_amount, net_paid: tax!.net_paid,
        tax_declaration_id: tax!.tax_declaration_id,
      }],
    })
    const line = snapshot.lines[0]
    expect(line.gross_ex_gst).toBe(1875)
    expect(line.wht_amount).toBe(375)
    expect(line.net_paid).toBe(1500)
    expect(line.contractor_payment_snapshot_id).toBe('snap-A')     // 6. link retained
    expect(line.tax_declaration_id).toBe('decl-A')                  // 6. declaration link retained
    expect(snapshot.wht_total).toBe(375)                            // 5. withholding displayed
  })

  it('7. later source changes cannot alter the issued snapshot (it is a frozen copy)', () => {
    // The issued snapshot holds a COPY of the figures. Mutating the source
    // snapshot object afterwards does not change an already-built snapshot.
    const built = buildIssuedSnapshot({
      statement_number: 'STMT-9002', contractor_id: 'myrtle',
      supplier: resolveSupplierIdentity({ full_name: 'Myrtle', legal_name: null, company_name: null, business_structure: 'sole_trader', tax_review_status: null }),
      period_start: '2026-08-01', period_end: '2026-08-31', issued_at: '2026-09-01T00:00:00Z', review_due_at: '2026-09-06T00:00:00Z',
      lines: [{ contractor_invoice_id: 'ci-A', invoice_number: 'CI-9001', job_number: null, service_date: '2026-08-31',
        description: null, site: null, hours: null, rate: null, pay_basis: 'guaranteed_net', amount: 1875,
        gst_status: 'not_assessed', gst_amount: null, contractor_payment_snapshot_id: 'snap-A',
        gross_ex_gst: 1875, wht_amount: 375, net_paid: 1500 }],
    })
    approved.withholdingAmount = 9999   // a later "source change"
    expect(built.lines[0].wht_amount).toBe(375)  // frozen — unaffected
    expect(built.wht_total).toBe(375)
    approved.withholdingAmount = 375    // restore for any later test
  })
})

describe('PR 9 migration + wiring safeguards (source-level)', () => {
  const sql = readFileSync(join(process.cwd(), 'docs/db/2026-08-04-contractor-remittance-tax-snapshot.sql'), 'utf8')
  const remit = readFileSync(join(process.cwd(), 'src/app/portal/contractor-invoices/_actions-remittance-batch.ts'), 'utf8')
  const issue = readFileSync(join(process.cwd(), 'src/app/portal/contractor-statements/_actions-issue.ts'), 'utf8')
  const resolver = readFileSync(join(process.cwd(), 'src/lib/contractor-remittance-tax.ts'), 'utf8')
  const doc = readFileSync(join(process.cwd(), 'src/components/ContractorRemittanceDocument.tsx'), 'utf8')
  const stmtDoc = readFileSync(join(process.cwd(), 'src/components/ContractorStatementSnapshot.tsx'), 'utf8')

  it('NO (contractor_id, supply_date) snapshot lookup remains anywhere', () => {
    // The resolver signature takes an explicit id map, not a supply date.
    expect(resolver).not.toMatch(/supplyDate.*approvedSnapshots|approvedSnapshots.*supplyDate/)
    // The wiring loads snapshots by id (.in('id', ...)), never by contractor+date.
    expect(remit).not.toMatch(/\.eq\('contractor_id', .*\)[\s\S]{0,80}\.eq\('status', 'approved'\)/)
    expect(remit).toMatch(/\.in\('id', snapshotIds\)/)
    expect(issue).toMatch(/\.in\('id', stmtSnapshotIds\)/)
  })

  it('the explicit link lives on the payable + is copied to the remittance', () => {
    expect(sql).toMatch(/alter table public\.contractor_invoices[\s\S]*add column if not exists contractor_payment_snapshot_id uuid[\s\S]*on delete restrict/)
    expect(remit).toMatch(/contractorPaymentSnapshotId: ci\.contractor_payment_snapshot_id/)
    expect(issue).toMatch(/contractorPaymentSnapshotId: ci\.contractor_payment_snapshot_id/)
  })

  it('a payable with an invalid/absent explicit snapshot BLOCKS creation/issue', () => {
    expect(remit).toMatch(/if \(r\.kind === 'error'\) return \{ error:/)
    expect(issue).toMatch(/if \(taxR\.kind === 'error'\) return \{ error:/)
  })

  it('DB validates approved+ok+same-contractor+same-schedule+exact-match on insert', () => {
    expect(sql).toMatch(/only an approved, ok snapshot can be frozen/)
    expect(sql).toMatch(/snapshot contractor does not match the line/)
    expect(sql).toMatch(/snapshot service schedule does not match the payable/)
    expect(sql).toMatch(/the payable is not linked to this snapshot/)
    expect(sql).toMatch(/frozen tax figures must match the approved snapshot exactly/)
    expect(sql).toMatch(/tax figures require a contractor_payment_snapshot_id/)
  })

  it('one approved snapshot backs at most one ACTIVE remittance item + correction lineage', () => {
    expect(sql).toMatch(/create unique index if not exists cri_one_active_snapshot_uidx[\s\S]*where contractor_payment_snapshot_id is not null and tax_status = 'active'/)
    expect(sql).toMatch(/supersedes_item_id uuid[\s\S]*on delete restrict/)
    expect(sql).toMatch(/superseding a frozen line requires a correction_reason/)
    expect(sql).toMatch(/a superseded line cannot revert to active/)
  })

  it('frozen figures + snapshot ref are immutable once written', () => {
    expect(sql).toMatch(/cri_freeze_tax_snapshot[\s\S]*frozen tax figures are immutable/)
  })

  it('the documents render gross, GST, withholding and net for tax-bearing lines', () => {
    expect(doc).toMatch(/Gross fee \(excl GST\)/)
    expect(doc).toMatch(/Withholding to IRD/)
    expect(doc).toMatch(/Net paid to you/)
    expect(stmtDoc).toMatch(/Schedular withholding to IRD/)
    expect(stmtDoc).toMatch(/Withholding/)
  })

  it('the documents do NOT expose IRD number / verifier / internal declaration metadata', () => {
    for (const forbidden of ['ird_number', 'irdNumber', 'verified_by', 'verifier', 'review_notes', 'tax_declaration_id', 'declaration_type']) {
      expect(doc).not.toContain(forbidden)
      expect(stmtDoc).not.toContain(forbidden)
    }
  })

  it('ordinary lines with no snapshot render unchanged (breakdown gated on the ref)', () => {
    expect(doc).toMatch(/line\.contractorPaymentSnapshotId == null && line\.whtAmount == null\) return null/)
    expect(stmtDoc).toMatch(/showWht = snapshot\.lines\.some\(\(l\) => l\.wht_amount != null\)/)
  })

  it('no money movement / no backfill in PR 9', () => {
    expect(sql).toMatch(/NO backfill/i)
    expect(sql).toMatch(/NO money movement/i)
    for (const t of ['stripe', 'payout', 'bank_transactions']) expect(remit).not.toContain(t)
  })

  // ── Operational wiring (this rework) ──────────────────────────────────────
  const create = readFileSync(join(process.cwd(), 'src/app/portal/contractor-invoices/_actions.ts'), 'utf8')
  const linkLib = readFileSync(join(process.cwd(), 'src/lib/contractor-payment-snapshot-link.ts'), 'utf8')

  it('payable creation validates + stores the EXPLICIT snapshot id (never inferred)', () => {
    expect(create).toMatch(/resolveSnapshotForPayable/)
    expect(create).toMatch(/contractor_payment_snapshot_id: snapshotId/)
    expect(create).toMatch(/service_schedule_id: scheduleId/)
    // schedule without snapshot, and snapshot without schedule, are both rejected
    expect(create).toMatch(/schedule-based \(schedular\) payable requires an approved payment snapshot id/)
    expect(create).toMatch(/A payment snapshot must be linked to its service schedule/)
    // never infers by date/amount
    expect(linkLib).not.toMatch(/supply_date.*eq|\.eq\('supply_date'|by amount/i)
    expect(linkLib).toMatch(/\.eq\('id', snapshotId\)/)
  })

  it('the DB requires a snapshot for any schedule-based payable + single active use', () => {
    expect(sql).toMatch(/ci_require_snapshot_for_schedule[\s\S]*a schedule-based \(schedular\) payable requires an approved contractor_payment_snapshot_id/)
    expect(sql).toMatch(/create unique index if not exists ci_one_active_snapshot_uidx[\s\S]*ci_tax_status = 'active'/)
  })

  it('approval re-validates a schedular payable’s snapshot (blocks superseded/void)', () => {
    expect(create).toMatch(/This schedular payable has no payment snapshot — it cannot be approved/)
    expect(create).toMatch(/Cannot approve schedular payable/)
  })

  it('remittance + statement block a schedular payable with no snapshot (no ordinary fallback)', () => {
    expect(remit).toMatch(/a schedular payable has no payment snapshot/)
    expect(issue).toMatch(/is schedular but has no payment snapshot/)
  })

  it('corrections retain the original + supersede via explicit lineage', () => {
    expect(create).toMatch(/ci_tax_status: 'superseded'/)
    expect(create).toMatch(/supersedes_invoice_id/)
    expect(sql).toMatch(/supersedes_invoice_id uuid[\s\S]*on delete restrict/)
    // the snapshot single-use check allows an explicit correction
    expect(linkLib).toMatch(/isCorrection/)
  })

  it('the snapshot single-use set excludes superseded payables', () => {
    expect(linkLib).toMatch(/activeSnapshotIds/)
    expect(linkLib).toMatch(/\.neq\('ci_tax_status', 'superseded'\)/)
  })
})
