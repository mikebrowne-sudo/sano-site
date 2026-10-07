import { readFileSync } from 'fs'
import { join } from 'path'
import {
  findInvoiceIssues, findSnapshotIssues, findRemittanceItemIssues, buildRemediationReport,
  type RemediationInvoice, type RemediationSnapshot, type RemediationRemittanceItem,
} from '@/lib/contractor-tax-remediation'

const inv = (over: Partial<RemediationInvoice> = {}): RemediationInvoice => ({
  id: 'ci1', invoiceNumber: 'CI-0001', contractorId: 'c1', contractorName: 'Ann', amount: 100,
  status: 'approved', ciTaxStatus: 'active', paymentType: 'standard', serviceScheduleId: null,
  contractorPaymentSnapshotId: null, gstStatus: 'applied', supplyDate: '2026-08-01',
  contractorTaxTreatment: 'ordinary_trade_creditor', contractorHasVerifiedDeclaration: true, ...over,
})
const snap = (over: Partial<RemediationSnapshot> = {}): RemediationSnapshot => ({
  id: 's1', snapshotNumber: 'CPS-0001', contractorId: 'c1', contractorName: 'Ann', status: 'approved',
  calcStatus: 'ok', taxTreatment: 'schedular_payment', withholdingAmount: 375, supplyDate: '2026-08-01',
  hasActiveWithholdingLine: false, ...over,
})
const ri = (over: Partial<RemediationRemittanceItem> = {}): RemediationRemittanceItem => ({
  id: 'ri1', contractorInvoiceId: 'ci1', contractorName: 'Ann', amount: 100, taxStatus: 'active',
  contractorPaymentSnapshotId: null, payableIsTaxBearing: false, ...over,
})

describe('findInvoiceIssues — ordinary invoices are clean; only real gaps flag', () => {
  it('a clean ordinary invoice produces no findings', () => {
    expect(findInvoiceIssues(inv())).toEqual([])
  })
  it('void / superseded invoices are ignored (historical records)', () => {
    expect(findInvoiceIssues(inv({ status: 'void', gstStatus: 'incomplete' }))).toEqual([])
    expect(findInvoiceIssues(inv({ ciTaxStatus: 'superseded', serviceScheduleId: 'sch1', contractorPaymentSnapshotId: null }))).toEqual([])
  })

  it('schedule-based payable with no snapshot is an ERROR', () => {
    const f = findInvoiceIssues(inv({ serviceScheduleId: 'sch1', contractorPaymentSnapshotId: null }))
    expect(f).toHaveLength(1)
    expect(f[0].code).toBe('schedular_payable_missing_snapshot')
    expect(f[0].severity).toBe('error')
  })

  it('GST incomplete/not_assessed is UNRESOLVED; pending_review is an ERROR (conflict)', () => {
    expect(findInvoiceIssues(inv({ gstStatus: 'incomplete' }))[0]).toMatchObject({ code: 'gst_unresolved', severity: 'unresolved' })
    expect(findInvoiceIssues(inv({ gstStatus: 'not_assessed' }))[0]).toMatchObject({ code: 'gst_unresolved', severity: 'unresolved' })
    expect(findInvoiceIssues(inv({ gstStatus: 'pending_review' }))[0]).toMatchObject({ code: 'gst_unresolved', severity: 'error' })
  })
  it('settled GST statuses do not flag', () => {
    for (const s of ['applied', 'not_registered', 'before_effective_date']) {
      expect(findInvoiceIssues(inv({ gstStatus: s })).some((f) => f.code === 'gst_unresolved')).toBe(false)
    }
  })

  it('schedular contractor without a verified IR330C: unresolved if unpaid, ERROR if paid', () => {
    const unpaid = findInvoiceIssues(inv({ contractorTaxTreatment: 'schedular_payment', contractorHasVerifiedDeclaration: false, status: 'approved', contractorPaymentSnapshotId: 's1' }))
    expect(unpaid.find((f) => f.code === 'declaration_missing')).toMatchObject({ severity: 'unresolved' })
    const paid = findInvoiceIssues(inv({ contractorTaxTreatment: 'schedular_payment', contractorHasVerifiedDeclaration: false, status: 'paid', contractorPaymentSnapshotId: 's1' }))
    expect(paid.find((f) => f.code === 'declaration_missing')).toMatchObject({ severity: 'error' })
  })

  it('schedular contractor PAID with no snapshot = ERROR (no withholding computed)', () => {
    const f = findInvoiceIssues(inv({ contractorTaxTreatment: 'schedular_payment', status: 'paid', contractorPaymentSnapshotId: null, contractorHasVerifiedDeclaration: true }))
    expect(f.find((x) => x.code === 'schedular_paid_without_withholding')).toMatchObject({ severity: 'error' })
  })
  it('schedular contractor UNPAID with no snapshot = UNRESOLVED (treatment not established)', () => {
    const f = findInvoiceIssues(inv({ contractorTaxTreatment: 'schedular_payment', status: 'approved', contractorPaymentSnapshotId: null, contractorHasVerifiedDeclaration: true }))
    expect(f.find((x) => x.code === 'withholding_treatment_unresolved')).toMatchObject({ severity: 'unresolved' })
  })
})

describe('findSnapshotIssues — approved schedular snapshot must have an active liability line', () => {
  it('flags a schedular approved snapshot with withholding and no active line (ERROR)', () => {
    const f = findSnapshotIssues(snap({ hasActiveWithholdingLine: false }))
    expect(f).toHaveLength(1)
    expect(f[0]).toMatchObject({ code: 'liability_line_missing', severity: 'error' })
  })
  it('no finding when the line exists, or not schedular, or draft, or zero withholding', () => {
    expect(findSnapshotIssues(snap({ hasActiveWithholdingLine: true }))).toEqual([])
    expect(findSnapshotIssues(snap({ taxTreatment: 'ordinary_trade_creditor' }))).toEqual([])
    expect(findSnapshotIssues(snap({ status: 'draft' }))).toEqual([])
    expect(findSnapshotIssues(snap({ withholdingAmount: 0 }))).toEqual([])
  })
})

describe('findRemittanceItemIssues — a tax-bearing payable remitted as amount-only is an ERROR', () => {
  it('flags an active tax-bearing line with no snapshot ref', () => {
    const f = findRemittanceItemIssues(ri({ payableIsTaxBearing: true, contractorPaymentSnapshotId: null }))
    expect(f).toHaveLength(1)
    expect(f[0]).toMatchObject({ code: 'remittance_tax_details_missing', severity: 'error' })
  })
  it('no finding for ordinary payables, superseded items, or already-frozen lines', () => {
    expect(findRemittanceItemIssues(ri({ payableIsTaxBearing: false }))).toEqual([])
    expect(findRemittanceItemIssues(ri({ payableIsTaxBearing: true, taxStatus: 'superseded' }))).toEqual([])
    expect(findRemittanceItemIssues(ri({ payableIsTaxBearing: true, contractorPaymentSnapshotId: 's1' }))).toEqual([])
  })
})

describe('buildRemediationReport — aggregation, ordering, error/unresolved split', () => {
  it('errors sort before unresolved; summary counts by severity + code', () => {
    const report = buildRemediationReport({
      invoices: [
        inv({ id: 'a', gstStatus: 'incomplete' }),                                    // unresolved
        inv({ id: 'b', serviceScheduleId: 'sch1', contractorPaymentSnapshotId: null }), // error
      ],
      snapshots: [snap()],                    // error (liability_line_missing)
      remittanceItems: [ri({ payableIsTaxBearing: true })], // error
    })
    expect(report.summary.total).toBe(4)
    expect(report.summary.errors).toBe(3)
    expect(report.summary.unresolved).toBe(1)
    expect(report.findings[0].severity).toBe('error')       // errors first
    expect(report.findings[report.findings.length - 1].severity).toBe('unresolved')
    expect(report.summary.byCode['liability_line_missing']).toBe(1)
  })
  it('a fully clean data set yields zero findings', () => {
    const report = buildRemediationReport({ invoices: [inv()], snapshots: [snap({ hasActiveWithholdingLine: true })], remittanceItems: [ri()] })
    expect(report.summary.total).toBe(0)
  })
})

describe('PR 10 read-only guarantee (source-level)', () => {
  const engine = readFileSync(join(process.cwd(), 'src/lib/contractor-tax-remediation.ts'), 'utf8')
  const loader = readFileSync(join(process.cwd(), 'src/app/portal/finance/contractor-tax-remediation/_lib/load-remediation.ts'), 'utf8')
  const page = readFileSync(join(process.cwd(), 'src/app/portal/finance/contractor-tax-remediation/page.tsx'), 'utf8')
  const route = readFileSync(join(process.cwd(), 'src/app/api/finance/contractor-tax-remediation-csv/route.ts'), 'utf8')

  it('the engine + loader perform NO writes (no insert/update/delete/upsert/rpc)', () => {
    for (const src of [engine, loader]) {
      for (const w of ['.insert(', '.update(', '.delete(', '.upsert(', '.rpc(']) {
        expect(src).not.toContain(w)
      }
    }
  })
  it('the report is finance-gated (page + CSV route)', () => {
    expect(page).toMatch(/isFinanceUser/)
    expect(route).toMatch(/isFinanceEmail/)
  })
  it('the page + CSV expose the error / unresolved distinction', () => {
    expect(page).toMatch(/Confirmed errors/)
    expect(page).toMatch(/Unresolved/)
    expect(route).toMatch(/Severity/)
  })
  it('no Myrtle-specific handling anywhere', () => {
    for (const src of [engine, loader, page, route]) {
      expect(src.toLowerCase()).not.toContain('myrtle')
    }
  })
})
