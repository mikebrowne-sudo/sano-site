import { readFileSync } from 'fs'
import { join } from 'path'
import { resolveRemittanceLineTax, hasFrozenTax, type ApprovedSnapshotForRemittance } from '@/lib/contractor-remittance-tax'

const snap = (over: Partial<ApprovedSnapshotForRemittance> = {}): ApprovedSnapshotForRemittance => ({
  id: 's1', contractorId: 'c1', status: 'approved', calcStatus: 'ok', supplyDate: '2026-08-15',
  grossExGst: 1875, gstAmount: 0, withholdingRate: 0.20, withholdingAmount: 375, netBank: 1500,
  taxDeclarationId: 'decl1', ...over,
})

describe('resolveRemittanceLineTax — freeze from an approved snapshot, never guess', () => {
  it('returns none when contractor or supply date is missing', () => {
    expect(resolveRemittanceLineTax(null, '2026-08-15', [snap()])).toEqual({ kind: 'none' })
    expect(resolveRemittanceLineTax('c1', null, [snap()])).toEqual({ kind: 'none' })
  })

  it('returns none when no approved snapshot matches (ordinary contractor)', () => {
    expect(resolveRemittanceLineTax('c1', '2026-08-15', [])).toEqual({ kind: 'none' })
    // matches contractor but not the supply date
    expect(resolveRemittanceLineTax('c1', '2026-09-15', [snap()])).toEqual({ kind: 'none' })
    // matches supply date but not the contractor
    expect(resolveRemittanceLineTax('c2', '2026-08-15', [snap()])).toEqual({ kind: 'none' })
  })

  it('ignores non-approved / non-ok snapshots', () => {
    expect(resolveRemittanceLineTax('c1', '2026-08-15', [snap({ status: 'draft' })])).toEqual({ kind: 'none' })
    expect(resolveRemittanceLineTax('c1', '2026-08-15', [snap({ calcStatus: 'pending_tax' })])).toEqual({ kind: 'none' })
    expect(resolveRemittanceLineTax('c1', '2026-08-15', [snap({ status: 'superseded' })])).toEqual({ kind: 'none' })
  })

  it('freezes the exact figures when exactly one approved snapshot matches (Myrtle-shaped)', () => {
    const r = resolveRemittanceLineTax('c1', '2026-08-15', [snap()])
    expect(r).toEqual({
      kind: 'frozen',
      tax: {
        contractor_payment_snapshot_id: 's1',
        gross_ex_gst: 1875, gst_amount: 0, wht_rate: 0.20, wht_amount: 375, net_paid: 1500,
        tax_declaration_id: 'decl1', supply_date: '2026-08-15',
      },
    })
  })

  it('is AMBIGUOUS (never guesses) when >1 approved snapshot matches the same contractor + supply date', () => {
    const r = resolveRemittanceLineTax('c1', '2026-08-15', [snap({ id: 'a' }), snap({ id: 'b' })])
    expect(r).toEqual({ kind: 'ambiguous', snapshotIds: ['a', 'b'] })
  })

  it('copies figures verbatim — does not recompute net from gross/wht', () => {
    // Deliberately inconsistent snapshot (net ≠ gross − wht): the resolver must
    // copy what the snapshot says, never re-derive it.
    const r = resolveRemittanceLineTax('c1', '2026-08-15', [snap({ netBank: 9999 })])
    expect(r.kind).toBe('frozen')
    if (r.kind === 'frozen') expect(r.tax.net_paid).toBe(9999)
  })

  it('hasFrozenTax reflects the snapshot ref', () => {
    expect(hasFrozenTax({ contractor_payment_snapshot_id: 's1' })).toBe(true)
    expect(hasFrozenTax({ contractor_payment_snapshot_id: null })).toBe(false)
    expect(hasFrozenTax({})).toBe(false)
  })
})

describe('PR 9 migration + wiring safeguards (source-level)', () => {
  const sql = readFileSync(join(process.cwd(), 'docs/db/2026-08-04-contractor-remittance-tax-snapshot.sql'), 'utf8')
  const remit = readFileSync(join(process.cwd(), 'src/app/portal/contractor-invoices/_actions-remittance-batch.ts'), 'utf8')
  const issue = readFileSync(join(process.cwd(), 'src/app/portal/contractor-statements/_actions-issue.ts'), 'utf8')

  it('adds all 7 tax columns + the snapshot ref, all nullable/additive', () => {
    for (const col of ['gross_ex_gst', 'gst_amount', 'wht_rate', 'wht_amount', 'net_paid', 'tax_declaration_id', 'supply_date']) {
      expect(sql).toMatch(new RegExp(`add column if not exists ${col}`))
    }
    expect(sql).toMatch(/add column if not exists contractor_payment_snapshot_id uuid[\s\S]*contractor_payment_tax_snapshots\(id\) on delete restrict/)
  })

  it('the snapshot + declaration FKs are ON DELETE RESTRICT (audit chain preserved)', () => {
    expect(sql).toMatch(/references public\.contractor_payment_tax_snapshots\(id\) on delete restrict/)
    expect(sql).toMatch(/references public\.contractor_tax_declarations\(id\) on delete restrict/)
  })

  it('frozen tax figures are immutable + must match the approved snapshot exactly', () => {
    expect(sql).toMatch(/cri_freeze_tax_snapshot[\s\S]*frozen tax figures are immutable/)
    expect(sql).toMatch(/cri_validate_tax_snapshot/)
    expect(sql).toMatch(/only an approved, ok snapshot can be frozen/)
    expect(sql).toMatch(/frozen tax figures must match the approved snapshot exactly/)
    // tax figures without a snapshot ref are rejected (no orphan figures)
    expect(sql).toMatch(/tax figures require a contractor_payment_snapshot_id/)
  })

  it('the remittance action freezes from an APPROVED snapshot, never recomputes', () => {
    expect(remit).toMatch(/resolveRemittanceLineTax/)
    expect(remit).toMatch(/\.eq\('status', 'approved'\)/)
    expect(remit).toMatch(/\.eq\('calc_status', 'ok'\)/)
    // no invented figures: tax fields default to null on adjustment lines
    expect(remit).toMatch(/contractor_payment_snapshot_id: null/)
  })

  it('the statement issue action freezes the same figures into the immutable snapshot', () => {
    expect(issue).toMatch(/resolveRemittanceLineTax/)
    expect(issue).toMatch(/\.eq\('status', 'approved'\)/)
    expect(issue).toMatch(/wht_total: snapshot\.wht_total/)
  })

  it('no money movement / no backfill in PR 9', () => {
    expect(sql).toMatch(/NO backfill/i)
    expect(sql).toMatch(/NO money movement/i)
    for (const t of ['stripe', 'payout', 'bank_transactions']) {
      expect(remit).not.toContain(t)
    }
  })
})
