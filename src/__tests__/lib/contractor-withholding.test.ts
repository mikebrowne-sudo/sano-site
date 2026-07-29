import { readFileSync } from 'fs'
import { join } from 'path'
import { validateWithholdingSource, withholdingPeriod, snapshotToWithholdingRow, type ApprovedSnapshotForWithholding } from '@/lib/contractor-withholding'

const approved = (over: Partial<ApprovedSnapshotForWithholding> = {}): ApprovedSnapshotForWithholding => ({
  id: 's1', contractorId: 'c1', status: 'approved', calcStatus: 'ok', supplyDate: '2026-08-15',
  withholdingRate: 0.20, grossExGst: 1875, withholdingAmount: 375, netBank: 1500, calcVersion: 'contractor-payment-v1',
  taxTreatment: 'schedular_payment', ...over,
})

describe('validateWithholdingSource — only an approved, ok, schedular snapshot with wht > 0', () => {
  it('accepts a valid approved schedular snapshot', () => {
    expect(validateWithholdingSource(approved())).toBeNull()
  })
  it('rejects a non-approved snapshot (draft/superseded)', () => {
    expect(validateWithholdingSource(approved({ status: 'draft' }))).toMatch(/approved payment snapshot/)
  })
  it('rejects a non-ok calc', () => {
    expect(validateWithholdingSource(approved({ calcStatus: 'pending_tax' }))).toMatch(/not resolved/)
  })
  it('rejects a non-schedular treatment', () => {
    expect(validateWithholdingSource(approved({ taxTreatment: 'ordinary_trade_creditor' }))).toMatch(/schedular_payment/)
  })
  it('rejects zero withholding', () => {
    expect(validateWithholdingSource(approved({ withholdingAmount: 0 }))).toMatch(/no withholding/)
  })
})

describe('withholdingPeriod — monthly, due the 20th following', () => {
  it('Aug payday → 2026-08 period, due 2026-09-20', () => {
    expect(withholdingPeriod('2026-08-15')).toMatchObject({ periodKey: '2026-08', periodStart: '2026-08-01', dueDate: '2026-09-20' })
  })
  it('Dec rolls the due month to next January', () => {
    expect(withholdingPeriod('2026-12-10').dueDate).toBe('2027-01-20')
  })
})

describe('snapshotToWithholdingRow — frozen from the snapshot', () => {
  it('copies the withholding figures + source snapshot id; starts not_filed/active', () => {
    const r = snapshotToWithholdingRow(approved(), '2026-08-31')
    expect(r).toMatchObject({
      contractor_id: 'c1', payment_snapshot_id: 's1', payday: '2026-08-31', supply_date: '2026-08-15',
      withholding_rate: 0.20, gross_ex_gst: 1875, withholding_amount: 375, net_bank: 1500,
      calc_version: 'contractor-payment-v1', filing_status: 'not_filed', status: 'active',
    })
  })
  it('Myrtle-shaped: $375 withholding from the $1,500-net snapshot', () => {
    expect(snapshotToWithholdingRow(approved(), '2026-08-31').withholding_amount).toBe(375)
  })
})

describe('migration + action safeguards (source-level)', () => {
  const sql = readFileSync(join(process.cwd(), 'docs/db/2026-08-03-contractor-withholding-liability.sql'), 'utf8')
  const action = readFileSync(join(process.cwd(), 'src/app/portal/payroll/contractor-withholding/_actions.ts'), 'utf8')

  it('one line per approved snapshot (unique) + ON DELETE RESTRICT', () => {
    expect(sql).toMatch(/payment_snapshot_id\s+uuid not null unique references public\.contractor_payment_tax_snapshots\(id\) on delete restrict/)
  })
  it('withholding lines are immutable (fact-update trigger)', () => {
    expect(sql).toMatch(/cwl_block_fact_updates/)
    expect(sql).toMatch(/a withholding line is immutable/)
  })
  it('filed/superseded/void lines cannot be deleted', () => {
    expect(sql).toMatch(/cwl_block_delete/)
    expect(sql).toMatch(/filing_status <> 'not_filed'[\s\S]*cannot be deleted|status in \('superseded','void'\)[\s\S]*cannot be deleted/)
  })
  it('the create action validates the snapshot source + is admin-gated', () => {
    expect(action).toMatch(/validateWithholdingSource/)
    expect(action).toMatch(/if\s*\(!user\)\s*return\s*\{\s*error:\s*'Admin only\.'/)
  })
  it('filing is MANUAL — no electronic transmission; payments recorded not initiated', () => {
    // No auto-file / transmit / pay-out call.
    for (const w of ['transmit', 'submitToIrd', 'sendToIrd', 'initiatePayment', 'payIrd']) expect(action).not.toContain(w)
    // Payment recording only records an existing transfer.
    expect(action).toMatch(/records an existing transfer|records, never initiates/i)
  })
  it('no money movement / bank write in the withholding actions', () => {
    for (const t of ['bank_transactions', 'stripe', 'payout']) expect(action).not.toContain(t)
  })
})
