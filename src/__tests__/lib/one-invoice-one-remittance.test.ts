// INVARIANT: a canonical contractor invoice may belong to only ONE active
// contractor remittance.
//
// The canonical job_id + contractor_id guard in approveContractorPay stops a
// second PAYABLE being raised for the same work, and is correct. The defect was
// one stage later — the same payable could be placed on two remittances:
//   CI-0015  Anishal Kumar  $80   on RA-0002 AND RA-0003  -> $160 paid
//   CI-0012  Kritika Kumar  $175  on RA-0001 AND RA-0007  -> $350 paid
//
// Defence in depth, all three layers asserted here:
//   1. Pay Run / builders exclude already-remitted invoices from the payable set
//   2. createContractorRemittance fails closed with a readable message
//   3. a DB trigger rejects it regardless of caller
//
// Historical duplicates are deliberately PRESERVED — the trigger grandfathers
// them and no remediation rewrites payment history.

import { readFileSync } from 'fs'
import { join } from 'path'

const read = (p: string) => readFileSync(join(process.cwd(), p), 'utf8')

const create = read('src/app/portal/contractor-invoices/_actions-remittance-batch.ts')
const edit = read('src/app/portal/contractor-invoices/_actions-remittance-edit.ts')
const planner = read('src/app/portal/contractor-invoices/remittances/_actions-by-contractor.ts')
const byContractorPage = read('src/app/portal/contractor-invoices/remittances/new-by-contractor/page.tsx')
const approve = read('src/app/portal/contractor-invoices/_actions-approve-pay.ts')
const sql = read('docs/db/2026-08-17-one-invoice-one-remittance.sql')

describe('layer 1 — already-remitted invoices are not offered as payable', () => {
  it('the by-contractor planner excludes remitted invoices (Pay Run source)', () => {
    expect(planner).toMatch(/from\('contractor_remittance_items'\)/)
    expect(planner).toMatch(/remittedSet/)
    expect(planner).toMatch(/!remittedSet\.has\(c\.id\)/)
  })

  it('the manual by-contractor builder excludes them too', () => {
    expect(byContractorPage).toMatch(/remittedSet/)
    expect(byContractorPage).toMatch(/if \(remittedSet\.has\(ci\.id as string\)\) continue/)
  })
})

describe('layer 2 — the server action fails closed', () => {
  it('checks prior membership BEFORE creating the header (no orphan on reject)', () => {
    const guardAt = create.indexOf('INVARIANT: one contractor invoice')
    const headerAt = create.indexOf("from('contractor_remittances')\n    .insert")
    expect(guardAt).toBeGreaterThan(-1)
    // The guard must appear before the header insert in source order.
    if (headerAt > -1) expect(guardAt).toBeLessThan(headerAt)
  })

  it('ignores superseded lines — a corrected line is not an active payment', () => {
    expect(create).toMatch(/!== 'superseded'/)
  })

  it('returns a useful message naming the CI and the existing RA, not a raw DB error', () => {
    expect(create).toMatch(/is already on \$\{r\?\.remittance_number/)
    expect(create).toMatch(/can only be paid once/)
    expect(create).not.toMatch(/duplicate key/)
    // Payee + payment date + paid state are included for context.
    expect(create).toMatch(/payee_label/)
    expect(create).toMatch(/paid_at \? 'paid' : 'not yet paid'/)
  })

  it('selects invoice_number so the message can name the payable', () => {
    expect(create).toMatch(/select\('id, invoice_number, amount/)
  })
})

describe('layer 3 — the database trigger', () => {
  it('fires on INSERT and UPDATE, for every writer', () => {
    expect(sql).toMatch(/before insert or update on public\.contractor_remittance_items/)
    expect(sql).toMatch(/for each row/)
  })

  it('permits adjustment lines (no invoice id)', () => {
    expect(sql).toMatch(/if new\.contractor_invoice_id is null then\s*\n\s*return new/)
  })

  it('permits a row updating itself (id is distinct from new.id)', () => {
    expect(sql).toMatch(/i\.id is distinct from new\.id/)
  })

  it('ignores superseded lines on both sides', () => {
    expect(sql).toMatch(/coalesce\(new\.tax_status, 'active'\) = 'superseded'/)
    expect(sql).toMatch(/coalesce\(i\.tax_status, 'active'\) <> 'superseded'/)
  })

  it('PRESERVES historical duplicates — no delete, update or renumber', () => {
    const body = sql.replace(/--.*$/gm, '')
    expect(body).not.toMatch(/\bdelete\s+from\b/i)
    expect(body).not.toMatch(/\bupdate\s+public\./i)
    expect(body).not.toMatch(/\btruncate\b/i)
  })

  it('explains why a unique index was not used', () => {
    expect(sql).toMatch(/CANNOT BE CREATED against current data/)
  })

  it('ships verification and rollback sections', () => {
    expect(sql).toMatch(/VERIFY BEFORE/)
    expect(sql).toMatch(/VERIFY AFTER/)
    expect(sql).toMatch(/ROLLBACK/)
  })
})

describe('what must NOT change', () => {
  it('the job_id + contractor_id payable guard is intact', () => {
    expect(approve).toMatch(/\.eq\('job_id', jobId\)/)
    expect(approve).toMatch(/\.eq\('contractor_id', contractorId\)/)
    expect(approve).toMatch(/already approved for pay for this contractor/)
  })

  it('a second contractor on the same job stays payable — different invoice', () => {
    // The guard keys on the INVOICE, never on the job alone, so a legitimate
    // second cleaner (e.g. JOB-0063: Lose Kalekale + Upasni Devi) is unaffected.
    expect(create).toMatch(/contractor_invoice_id/)
    expect(create).not.toMatch(/\.in\('job_id', ciIds\)/)
  })

  it('the manual edit path still cannot set contractor_invoice_id', () => {
    // It updates descriptive fields only, so it can never create a duplicate.
    expect(edit).toMatch(/job_number: nullify\(line\.jobNumber\)/)
    expect(edit).not.toMatch(/contractor_invoice_id:/)
  })

  it('tax/GST/withholding safeguards in remittance creation are untouched', () => {
    expect(create).toMatch(/a schedular payable has no payment snapshot/)
    expect(create).toMatch(/contractorPaymentSnapshotId: ci\.contractor_payment_snapshot_id/)
  })
})
