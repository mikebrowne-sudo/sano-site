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

  // §1 — DB-level snapshot enforcement + exact frozen agreement.
  it('§1 a DB trigger re-validates the snapshot on insert (approved/ok/schedular/wht>0/contractor)', () => {
    expect(sql).toMatch(/create or replace function public\.cwl_validate_snapshot/)
    expect(sql).toMatch(/snapshot must be approved/)
    expect(sql).toMatch(/snapshot calc must be ok/)
    expect(sql).toMatch(/snapshot must be schedular_payment/)
    expect(sql).toMatch(/snapshot has no withholding/)
    expect(sql).toMatch(/contractor mismatch with snapshot/)
    expect(sql).toMatch(/cwl_validate_snapshot_trg before insert/)
  })
  it('§1 the line figures must match the snapshot exactly (no recalculation)', () => {
    expect(sql).toMatch(/line figures must match the snapshot exactly/)
    // The exact-match check covers all six frozen figures.
    for (const col of ['supply_date', 'withholding_rate', 'gross_ex_gst', 'withholding_amount', 'net_bank', 'calc_version']) {
      expect(sql).toMatch(new RegExp(`s\\.${col} is distinct from new\\.${col}`))
    }
  })

  // §2 — filing / correction lifecycle constraints + triggers.
  it('§2 not_filed forbids filing metadata; filed/accepted require it', () => {
    expect(sql).toMatch(/cwl_not_filed_no_meta[\s\S]*filed_at is null and filed_by is null/)
    expect(sql).toMatch(/cwl_filed_requires_meta[\s\S]*filed_at is not null and filed_by is not null/)
  })
  it('§2 filing_reference is optional for filed but required before accepted', () => {
    expect(sql).toMatch(/cwl_accepted_requires_reference[\s\S]*filing_status <> 'accepted' or \(filing_reference is not null/)
    expect(action).toMatch(/A filing reference is required before marking a filing accepted/)
  })
  it('§2 accepted cannot revert to not_filed (DB-enforced; action type cannot target it)', () => {
    expect(sql).toMatch(/an accepted filing cannot revert to not_filed/)
    // The server action's filingStatus type excludes 'not_filed', so it can never request the revert.
    expect(action).toMatch(/filingStatus: 'filed' \| 'accepted' \| 'correction_required'/)
  })
  it('§2 filing metadata cannot be cleared once filed/accepted', () => {
    expect(sql).toMatch(/filing metadata cannot be cleared once filed/)
  })
  it('§2 supersession/void require their metadata; self-supersession blocked', () => {
    expect(sql).toMatch(/cwl_superseded_requires_meta[\s\S]*superseded_at is not null and superseded_by_id is not null and correction_reason is not null/)
    expect(sql).toMatch(/cwl_void_requires_reason[\s\S]*status <> 'void' or correction_reason is not null/)
    expect(sql).toMatch(/cwl_no_self_supersede check \(superseded_by_id is null or superseded_by_id <> id\)/)
    expect(sql).toMatch(/cwl_no_self_supersedes check \(supersedes_id is null or supersedes_id <> id\)/)
  })
  it('§2 a superseding correction must belong to the same contractor + lineage refs RESTRICT', () => {
    expect(sql).toMatch(/cwl_same_contractor[\s\S]*same contractor/)
    expect(sql).toMatch(/supersedes_id\s+uuid references public\.contractor_withholding_lines\(id\) on delete restrict/)
    expect(sql).toMatch(/superseded_by_id\s+uuid references public\.contractor_withholding_lines\(id\) on delete restrict/)
  })
  it('§2 only dedicated server actions transition filing status', () => {
    expect(action).toMatch(/export async function setWithholdingFilingStatus/)
  })

  // §3 — recorded payments immutable + reversible.
  it('§3 recorded payments are immutable + cannot be deleted', () => {
    expect(sql).toMatch(/cwp_block_fact_updates[\s\S]*a recorded payment is immutable/)
    expect(sql).toMatch(/cwp_block_delete[\s\S]*cannot be deleted — reverse them instead/)
  })
  it('§3 a reversal requires a reason and preserves the original (status active|reversed)', () => {
    expect(sql).toMatch(/status\s+text not null default 'active' check \(status in \('active','reversed'\)\)/)
    expect(sql).toMatch(/cwp_reversed_requires_reason[\s\S]*reversed_at is not null and reversal_reason is not null/)
    expect(sql).toMatch(/reverses_id\s+uuid references public\.contractor_withholding_payments\(id\) on delete restrict/)
    expect(action).toMatch(/export async function reverseWithholdingPayment/)
    expect(action).toMatch(/A reversal reason is required/)
  })
  it('§3 the action reverses (never edits/deletes) and can record a corrective payment', () => {
    expect(action).toMatch(/status: 'reversed'[\s\S]*reversed_at[\s\S]*reversal_reason/)
    expect(action).toMatch(/reverses_id: input\.paymentId/)
    // No .delete() on the payments table anywhere in the actions.
    expect(action).not.toMatch(/contractor_withholding_payments'\)[\s\S]{0,40}\.delete\(/)
  })

  // §4 — liability-period isolation from the PAYE/GST ledger.
  it('§4 contractor withholding uses its OWN period table, never ird_liabilities', () => {
    expect(sql).toMatch(/create table if not exists public\.contractor_withholding_periods/)
    // The actions never QUERY ird_liabilities (only a comment may name it for contrast).
    expect(action).not.toMatch(/\.from\('ird_liabilities'\)/)
    expect(sql).toMatch(/withholding_period_id uuid not null references public\.contractor_withholding_periods\(id\) on delete restrict/)
  })
})
