import { readFileSync } from 'fs'
import { join } from 'path'
import { canApproveSnapshot, calcToSnapshotRow, NON_APPROVABLE_STATUSES } from '@/lib/contractor-payment-snapshot'
import { computeContractorPayment, type PaymentCalcInput } from '@/lib/contractor-payment-calc'
import type { DeclarationRecord } from '@/lib/contractor-tax-declaration'
import type { GstHistoryRecord } from '@/lib/contractor-gst-history'

const chosen = (r: number): DeclarationRecord => ({ id: 'd', status: 'verified', declarationType: 'contractor_chosen', withholdingRate: r, effectiveDate: '2026-01-01', expiryDate: null })
const gstNotReg: GstHistoryRecord = { id: 'g', status: 'verified', gstRegistered: false, gstNumber: null, effectiveDate: '2026-01-01', endDate: null }
const gstReg: GstHistoryRecord = { id: 'gr', status: 'verified', gstRegistered: true, gstNumber: '135-712-264', effectiveDate: '2026-01-01', endDate: null }

const calc = (over: Partial<PaymentCalcInput>) => computeContractorPayment({
  scheduleId: 'sch-1', scheduleVersionKey: 'v1', paymentMethod: 'fixed_monthly',
  agreedAmount: 1500, paymentBasis: 'guaranteed_net', rateBasis: 'gst_exclusive',
  taxTreatment: 'schedular_payment', taxDeclarations: [chosen(0.20)], gstHistory: [gstNotReg], supplyDateIso: '2026-08-15', ...over,
})

describe('canApproveSnapshot — hard gate', () => {
  it('only ok can be approved', () => {
    expect(canApproveSnapshot({ status: 'ok' }).ok).toBe(true)
  })
  it('every non-approvable status is blocked', () => {
    for (const s of NON_APPROVABLE_STATUSES) {
      expect(canApproveSnapshot({ status: s }).ok).toBe(false)
    }
  })
})

describe('calcToSnapshotRow — persists the canonical result verbatim', () => {
  it('maps every canonical field; never a full IRD number or review notes', () => {
    const r = calcToSnapshotRow(calc({ gstHistory: [gstReg] }), 'contractor-x')
    expect(r).toMatchObject({
      contractor_id: 'contractor-x', service_schedule_id: 'sch-1', schedule_version_key: 'v1',
      calc_status: 'ok', calc_version: 'contractor-payment-v1', supply_date: '2026-08-15',
      payment_basis: 'guaranteed_net', rate_basis: 'gst_exclusive', agreed_amount: 1500, tax_treatment: 'schedular_payment',
      gst_resolution: 'registered', gst_history_id: 'gr', tax_declaration_id: 'd', declaration_type: 'contractor_chosen',
      withholding_rate: 0.20, gross_ex_gst: 1875, gst_amount: 281.25, gross_incl_gst: 2156.25,
      withholding_amount: 375, net_bank: 1500, sano_cost: 2156.25, recoverable_gst: 281.25,
    })
    // No IRD number / review-note fields copied.
    expect(Object.keys(r)).not.toContain('ird_number')
    expect(Object.keys(r)).not.toContain('review_notes')
    expect(Object.keys(r)).not.toContain('contracting_ird_number')
  })

  it('Myrtle fixture: $1,500 net @20% not registered → 1875/0/375/1500/1875, v1', () => {
    const r = calcToSnapshotRow(calc({}), 'myrtle-fixture')
    expect(r).toMatchObject({ net_bank: 1500, gross_ex_gst: 1875, gst_amount: 0, withholding_amount: 375, sano_cost: 1875, calc_version: 'contractor-payment-v1' })
  })

  it('gross-fee snapshot maps too', () => {
    const r = calcToSnapshotRow(calc({ paymentBasis: 'gross_fee', agreedAmount: 2000, taxDeclarations: [chosen(0.20)] }), 'c')
    expect(r).toMatchObject({ payment_basis: 'gross_fee', gross_ex_gst: 2000, withholding_amount: 400, net_bank: 1600 })
  })

  it('a blocked/pending calc maps with null figures (draft preview only, never approvable)', () => {
    const r = calcToSnapshotRow(calc({ taxDeclarations: [] }), 'c') // pending_tax
    expect(r.calc_status).toBe('pending_tax')
    expect(r.gross_ex_gst).toBeNull()
    expect(canApproveSnapshot({ status: 'pending_tax' }).ok).toBe(false)
  })
})

describe('migration + action safeguards (source-level)', () => {
  const sql = readFileSync(join(process.cwd(), 'docs/db/2026-08-02-contractor-payment-tax-snapshots.sql'), 'utf8')
  const action = readFileSync(join(process.cwd(), 'src/app/portal/contractors/[id]/tax/_snapshot-actions.ts'), 'utf8')

  it('DB hard gate: approved requires calc_status = ok', () => {
    expect(sql).toMatch(/cpts_approved_requires_ok[\s\S]*status <> 'approved' or calc_status = 'ok'/)
  })
  it('approved snapshots are immutable (trigger blocks fact updates)', () => {
    expect(sql).toMatch(/cpts_immutable_approved/)
    expect(sql).toMatch(/an approved snapshot is immutable/)
  })
  it('corrections create a superseding replacement, not an overwrite', () => {
    expect(action).toMatch(/supersedes_id:\s*snapshotId/)
    expect(action).toMatch(/status:\s*'superseded'[\s\S]*superseded_by_id:\s*replacement\.id/)
  })
  it('the approve action re-checks the hard gate + is admin-gated', () => {
    expect(action).toMatch(/canApproveSnapshot/)
    expect(action).toMatch(/if\s*\(!user\)\s*return\s*\{\s*error:\s*'Admin only\.'/)
  })
  it('stores calc version + source ids for audit', () => {
    // calcToSnapshotRow carries these; the table has the columns.
    expect(sql).toMatch(/calc_version\s+text not null/)
    expect(sql).toMatch(/gst_history_id\s+uuid/)
    expect(sql).toMatch(/tax_declaration_id\s+uuid/)
    expect(sql).toMatch(/schedule_version_key\s+text/)
  })
  it('NO IRD liability / payday filing / payment / backfill in PR 7', () => {
    for (const t of ['ird_liab', 'pay_run', 'payday', 'employment_information']) expect(action).not.toContain(t)
    // no bulk backfill of existing invoices.
    expect(action).not.toContain('contractor_invoices')
    expect(sql).not.toMatch(/insert into public\.contractor_payment_tax_snapshots\b[\s\S]*select/i) // no backfill INSERT..SELECT
  })
})
