import { readFileSync } from 'fs'
import { join } from 'path'
import { computeContractorPayment, type PaymentCalcInput } from '@/lib/contractor-payment-calc'
import type { DeclarationRecord } from '@/lib/contractor-tax-declaration'
import type { GstHistoryRecord } from '@/lib/contractor-gst-history'

const SUPPLY = '2026-08-15'

const verifiedChosen = (rate: number): DeclarationRecord => ({ id: 'd', status: 'verified', declarationType: 'contractor_chosen', withholdingRate: rate, expiryDate: null, effectiveDate: '2026-01-01' })
const verifiedExemption: DeclarationRecord = { id: 'e', status: 'verified', declarationType: 'exemption', withholdingRate: null, expiryDate: '2027-01-01', effectiveDate: '2026-01-01' }
const gstRegistered: GstHistoryRecord = { id: 'g', status: 'verified', gstRegistered: true, gstNumber: '135-712-264', effectiveDate: '2026-01-01', endDate: null }
const gstNotReg: GstHistoryRecord = { id: 'g2', status: 'verified', gstRegistered: false, gstNumber: null, effectiveDate: '2026-01-01', endDate: null }

const base = (over: Partial<PaymentCalcInput>): PaymentCalcInput => ({
  agreedAmount: 1500, paymentBasis: 'guaranteed_net', rateBasis: 'gst_exclusive',
  taxTreatment: 'schedular_payment', taxDeclarations: [verifiedChosen(0.20)], gstHistory: [gstNotReg],
  supplyDateIso: SUPPLY, ...over,
})

describe('computeContractorPayment — Myrtle Schedule A (guaranteed net, GST excl, not registered, 20%)', () => {
  it('$1,500 net @ 20% → gross $1,875, wht $375, GST $0, Sano cost $1,875', () => {
    const r = computeContractorPayment(base({}))
    expect(r.status).toBe('ok')
    expect(r.netBank).toBe(1500)
    expect(r.grossExGst).toBe(1875)
    expect(r.whtAmount).toBe(375)
    expect(r.gst).toBe(0)
    expect(r.sanoCost).toBe(1875)
  })

  it('recomputes for a different verified rate (10% / 30%) — nothing hard-coded', () => {
    expect(computeContractorPayment(base({ taxDeclarations: [verifiedChosen(0.10)] })).grossExGst).toBe(1666.67)
    expect(computeContractorPayment(base({ taxDeclarations: [verifiedChosen(0.30)] })).grossExGst).toBe(2142.86)
  })

  it('guaranteed net + GST registered adds GST on top of the grossed-up ex-GST base', () => {
    const r = computeContractorPayment(base({ gstHistory: [gstRegistered] }))
    expect(r.grossExGst).toBe(1875)
    expect(r.gst).toBe(281.25) // 1875 × 0.15
    expect(r.netBank).toBe(1500)
    expect(r.sanoCost).toBe(2156.25)
  })
})

describe('gross_fee basis', () => {
  it('exclusive gross fee, schedular 20%: wht on the full ex-GST amount', () => {
    const r = computeContractorPayment(base({ paymentBasis: 'gross_fee', agreedAmount: 2000, taxDeclarations: [verifiedChosen(0.20)] }))
    expect(r.grossExGst).toBe(2000)
    expect(r.whtAmount).toBe(400)
    expect(r.netBank).toBe(1600)
  })
  it('inclusive gross fee with GST strips GST first; withholding only on the ex-GST base', () => {
    const r = computeContractorPayment(base({ paymentBasis: 'gross_fee', rateBasis: 'gst_inclusive', agreedAmount: 2300, gstHistory: [gstRegistered], taxDeclarations: [verifiedChosen(0.20)] }))
    expect(r.grossExGst).toBe(2000) // 2300 − 2300×3/23
    expect(r.gst).toBe(300)
    expect(r.whtAmount).toBe(400) // on 2000, not on GST
    expect(r.netBank).toBe(1600)
  })
})

describe('withholding is never on the GST component', () => {
  it('wht amount is identical with and without GST (same ex-GST base)', () => {
    const withGst = computeContractorPayment(base({ paymentBasis: 'gross_fee', agreedAmount: 2000, gstHistory: [gstRegistered], taxDeclarations: [verifiedChosen(0.20)] }))
    const noGst = computeContractorPayment(base({ paymentBasis: 'gross_fee', agreedAmount: 2000, gstHistory: [gstNotReg], taxDeclarations: [verifiedChosen(0.20)] }))
    expect(withGst.whtAmount).toBe(noGst.whtAmount)
    expect(withGst.whtAmount).toBe(400)
  })
})

describe('exemption + ordinary trade creditor', () => {
  it('verified exemption → 0% withholding, net = gross', () => {
    const r = computeContractorPayment(base({ taxTreatment: 'exempt_certificate', taxDeclarations: [verifiedExemption], paymentBasis: 'gross_fee', agreedAmount: 1000 }))
    expect(r.status).toBe('ok')
    expect(r.whtAmount).toBe(0)
    expect(r.netBank).toBe(1000)
  })
  it('ordinary trade creditor → no withholding at all, no declaration needed', () => {
    const r = computeContractorPayment(base({ taxTreatment: 'ordinary_trade_creditor', taxDeclarations: [], paymentBasis: 'gross_fee', agreedAmount: 500 }))
    expect(r.status).toBe('ok')
    expect(r.whtAmount).toBe(0)
    expect(r.netBank).toBe(500)
  })
})

describe('never guesses — blocked/pending states with null figures', () => {
  it('schedular + no verified declaration → pending_tax, figures null', () => {
    const r = computeContractorPayment(base({ taxDeclarations: [] }))
    expect(r.status).toBe('pending_tax')
    expect(r.grossExGst).toBeNull()
    expect(r.whtAmount).toBeNull()
    expect(r.netBank).toBe(1500) // guaranteed-net anchor still echoed
  })
  it('unclassified schedule → blocked', () => {
    expect(computeContractorPayment(base({ taxTreatment: 'pending_review' })).status).toBe('blocked')
    expect(computeContractorPayment(base({ taxTreatment: null })).status).toBe('blocked')
  })
  it('GST unresolved (no verified GST status covers the date) → gst_unresolved', () => {
    const r = computeContractorPayment(base({ gstHistory: [], taxDeclarations: [verifiedChosen(0.20)] }))
    expect(r.status).toBe('gst_unresolved')
    expect(r.gst).toBeNull()
  })
  it('a future-effective declaration does not apply early → pending_tax', () => {
    const future = verifiedChosen(0.20); future.effectiveDate = '2026-12-01'
    const r = computeContractorPayment(base({ taxDeclarations: [future] }))
    expect(r.status).toBe('pending_tax')
  })
})

describe('PR 6 is pure preview — writes NOTHING to financial records', () => {
  const calc = readFileSync(join(process.cwd(), 'src/lib/contractor-payment-calc.ts'), 'utf8')
  const preview = readFileSync(join(process.cwd(), 'src/lib/contractor-payment-preview.ts'), 'utf8')

  it('the calc engine has no DB access at all (pure)', () => {
    expect(calc).not.toContain('supabase')
    expect(calc).not.toContain('getServiceSupabase')
  })
  it('the preview helper only READS — no insert/update/upsert/delete', () => {
    for (const w of ['.insert(', '.update(', '.upsert(', '.delete(']) {
      expect(preview).not.toContain(w)
    }
    // and never touches invoices / remittances / payroll / IRD tables.
    for (const t of ['contractor_invoices', 'contractor_remittance', 'pay_run', 'ird_liab']) {
      expect(preview).not.toContain(t)
    }
  })
})

describe('date-resolved inputs (uses the row applicable on the supply date)', () => {
  it('resolves the tax rate + GST window as at the supply date, not newest', () => {
    // 10% until Jun, 25% from Jul.
    const decls: DeclarationRecord[] = [
      { id: 'old', status: 'superseded', declarationType: 'contractor_chosen', withholdingRate: 0.10, effectiveDate: '2026-01-01', expiryDate: null },
      { id: 'new', status: 'verified', declarationType: 'contractor_chosen', withholdingRate: 0.25, effectiveDate: '2026-07-01', expiryDate: null },
    ]
    // superseded rows are ignored; the verified one applies on 15 Aug.
    const r = computeContractorPayment(base({ taxDeclarations: decls, paymentBasis: 'gross_fee', agreedAmount: 1000 }))
    expect(r.whtRate).toBe(0.25)
    expect(r.whtAmount).toBe(250)
  })
})
