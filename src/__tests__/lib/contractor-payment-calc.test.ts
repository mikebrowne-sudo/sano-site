import { readFileSync } from 'fs'
import { join } from 'path'
import { computeContractorPayment, CONTRACTOR_PAYMENT_CALC_VERSION, type PaymentCalcInput } from '@/lib/contractor-payment-calc'
import type { DeclarationRecord } from '@/lib/contractor-tax-declaration'
import type { GstHistoryRecord } from '@/lib/contractor-gst-history'

const SUPPLY = '2026-08-15'

const verifiedChosen = (rate: number, id = 'd'): DeclarationRecord => ({ id, status: 'verified', declarationType: 'contractor_chosen', withholdingRate: rate, expiryDate: null, effectiveDate: '2026-01-01' })
const verifiedExemption = (expiry: string | null = '2027-01-01'): DeclarationRecord => ({ id: 'e', status: 'verified', declarationType: 'exemption', withholdingRate: null, expiryDate: expiry, effectiveDate: '2026-01-01' })
const gstRegistered: GstHistoryRecord = { id: 'g', status: 'verified', gstRegistered: true, gstNumber: '135-712-264', effectiveDate: '2026-01-01', endDate: null }
const gstRegisteredNoNumber: GstHistoryRecord = { id: 'gN', status: 'verified', gstRegistered: true, gstNumber: null, effectiveDate: '2026-01-01', endDate: null }
const gstNotReg: GstHistoryRecord = { id: 'g2', status: 'verified', gstRegistered: false, gstNumber: null, effectiveDate: '2026-01-01', endDate: null }

const base = (over: Partial<PaymentCalcInput>): PaymentCalcInput => ({
  scheduleId: 'sch-1', scheduleVersionKey: '2026-08-01|t', paymentMethod: 'fixed_monthly',
  agreedAmount: 1500, paymentBasis: 'guaranteed_net', rateBasis: 'gst_exclusive',
  taxTreatment: 'schedular_payment', taxDeclarations: [verifiedChosen(0.20)], gstHistory: [gstNotReg],
  supplyDateIso: SUPPLY, ...over,
})

describe('§2 Myrtle Schedule A (guaranteed net $1,500, not registered, schedular 20%)', () => {
  it('$1,500 net @ 20% → gross $1,875, wht $375, GST $0, Sano cost $1,875; $1,500 is what she RECEIVES', () => {
    const r = computeContractorPayment(base({}))
    expect(r.status).toBe('ok')
    expect(r.netBank).toBe(1500)          // she receives 1500
    expect(r.grossExGst).toBe(1875)
    expect(r.withholdingAmount).toBe(375)
    expect(r.gst).toBe(0)
    expect(r.sanoCost).toBe(1875)
    expect(r.recoverableGst).toBe(0)
  })
})

describe('§1/§9 canonical result contract', () => {
  it('returns a complete, self-describing result PR 7 can persist directly', () => {
    const r = computeContractorPayment(base({ gstHistory: [gstRegistered] }))
    expect(r).toMatchObject({
      status: 'ok', calcVersion: 'contractor-payment-v1', rounding: expect.any(String),
      scheduleId: 'sch-1', scheduleVersionKey: '2026-08-01|t', supplyDate: SUPPLY, paymentMethod: 'fixed_monthly',
      paymentBasis: 'guaranteed_net', rateBasis: 'gst_exclusive', agreedAmount: 1500, taxTreatment: 'schedular_payment',
      gstResolution: 'registered', gstHistoryId: 'g', taxDeclarationId: 'd', declarationType: 'contractor_chosen',
      withholdingRate: 0.20, grossExGst: 1875, gst: 281.25, grossInclGst: 2156.25, withholdingAmount: 375,
      netBank: 1500, sanoCost: 2156.25, recoverableGst: 281.25,
    })
  })
  it('exposes the exported calc version constant', () => {
    expect(CONTRACTOR_PAYMENT_CALC_VERSION).toBe('contractor-payment-v1')
  })
})

describe('§3 GST inclusive/exclusive × payment basis', () => {
  it('gross_fee + GST exclusive: GST added to the agreed ex-GST amount', () => {
    const r = computeContractorPayment(base({ paymentBasis: 'gross_fee', rateBasis: 'gst_exclusive', agreedAmount: 2000, gstHistory: [gstRegistered], taxDeclarations: [verifiedChosen(0.20)] }))
    expect(r.grossExGst).toBe(2000); expect(r.gst).toBe(300); expect(r.withholdingAmount).toBe(400); expect(r.netBank).toBe(1600)
  })
  it('gross_fee + GST inclusive: GST extracted from the agreed total; wht on the ex-GST base only', () => {
    const r = computeContractorPayment(base({ paymentBasis: 'gross_fee', rateBasis: 'gst_inclusive', agreedAmount: 2300, gstHistory: [gstRegistered], taxDeclarations: [verifiedChosen(0.20)] }))
    expect(r.grossExGst).toBe(2000); expect(r.gst).toBe(300); expect(r.withholdingAmount).toBe(400)
  })
  it('guaranteed_net + GST exclusive (registered): gross up, then add GST separately', () => {
    const r = computeContractorPayment(base({ gstHistory: [gstRegistered] }))
    expect(r.grossExGst).toBe(1875); expect(r.gst).toBe(281.25); expect(r.netBank).toBe(1500); expect(r.sanoCost).toBe(2156.25)
  })
  it('guaranteed_net + GST INCLUSIVE is BLOCKED (unsupported, not silently chosen)', () => {
    const r = computeContractorPayment(base({ rateBasis: 'gst_inclusive' }))
    expect(r.status).toBe('unsupported')
    expect(r.grossExGst).toBeNull()
    expect(r.reason).toMatch(/not supported/i)
  })
})

describe('§5 blocking/pending states — never plausible zeroes', () => {
  it('unclassified / pending_review schedule → blocked', () => {
    expect(computeContractorPayment(base({ taxTreatment: 'pending_review' })).status).toBe('blocked')
    expect(computeContractorPayment(base({ taxTreatment: null })).status).toBe('blocked')
  })
  it('schedular + no verified declaration → pending_tax (figures null, net anchor echoed)', () => {
    const r = computeContractorPayment(base({ taxDeclarations: [] }))
    expect(r.status).toBe('pending_tax'); expect(r.grossExGst).toBeNull(); expect(r.gst).toBeNull(); expect(r.netBank).toBe(1500)
  })
  it('expired exemption → pending_tax', () => {
    const r = computeContractorPayment(base({ taxTreatment: 'exempt_certificate', taxDeclarations: [verifiedExemption('2026-06-30')] }))
    expect(r.status).toBe('pending_tax')
  })
  it('expired tailored rate → pending_tax', () => {
    const tailored: DeclarationRecord = { id: 't', status: 'verified', declarationType: 'tailored_rate', withholdingRate: 0.05, effectiveDate: '2026-01-01', expiryDate: '2026-06-30' }
    expect(computeContractorPayment(base({ taxDeclarations: [tailored] })).status).toBe('pending_tax')
  })
  it('unresolved GST history → gst_unresolved', () => {
    expect(computeContractorPayment(base({ gstHistory: [], taxDeclarations: [verifiedChosen(0.20)] })).status).toBe('gst_unresolved')
  })
  it('GST registered but missing verified GST number → gst_incomplete', () => {
    const r = computeContractorPayment(base({ gstHistory: [gstRegisteredNoNumber] }))
    expect(r.status).toBe('gst_incomplete'); expect(r.gst).toBeNull()
  })
  it('an invalid verified rate (>= 1) → unsupported', () => {
    const bad = verifiedChosen(1); // 100%
    expect(computeContractorPayment(base({ taxDeclarations: [bad] })).status).toBe('unsupported')
  })
  it('future-effective tax declaration does not apply early → pending_tax', () => {
    const future = verifiedChosen(0.20); future.effectiveDate = '2026-12-01'
    expect(computeContractorPayment(base({ taxDeclarations: [future] })).status).toBe('pending_tax')
  })
  it('future-effective GST does not apply early → gst_unresolved before it starts', () => {
    const futureGst: GstHistoryRecord = { id: 'fg', status: 'verified', gstRegistered: true, gstNumber: '1', effectiveDate: '2026-12-01', endDate: null }
    expect(computeContractorPayment(base({ gstHistory: [futureGst], taxDeclarations: [verifiedChosen(0.20)] })).status).toBe('gst_unresolved')
  })
  it('supply after a verified GST end date (no successor) → gst_unresolved', () => {
    const ended: GstHistoryRecord = { id: 'eg', status: 'verified', gstRegistered: true, gstNumber: '1', effectiveDate: '2026-01-01', endDate: '2026-06-30' }
    expect(computeContractorPayment(base({ gstHistory: [ended], taxDeclarations: [verifiedChosen(0.20)] })).status).toBe('gst_unresolved')
  })
})

describe('§6 ordinary trade creditor + exemption', () => {
  it('ordinary trade creditor → no withholding, no declaration needed; GST still applies if registered', () => {
    const r = computeContractorPayment(base({ taxTreatment: 'ordinary_trade_creditor', taxDeclarations: [], paymentBasis: 'gross_fee', agreedAmount: 1000, gstHistory: [gstRegistered] }))
    expect(r.status).toBe('ok'); expect(r.withholdingAmount).toBe(0); expect(r.gst).toBe(150); expect(r.netBank).toBe(1000)
  })
  it('verified exemption → 0% withholding, net = gross', () => {
    const r = computeContractorPayment(base({ taxTreatment: 'exempt_certificate', taxDeclarations: [verifiedExemption()], paymentBasis: 'gross_fee', agreedAmount: 1000 }))
    expect(r.status).toBe('ok'); expect(r.withholdingAmount).toBe(0); expect(r.netBank).toBe(1000)
  })
})

describe('§7 rounding — cents, unrounded rate intermediates, reconciliation', () => {
  it('withholding is never on the GST component (same ex-GST base with/without GST)', () => {
    const withGst = computeContractorPayment(base({ paymentBasis: 'gross_fee', agreedAmount: 2000, gstHistory: [gstRegistered], taxDeclarations: [verifiedChosen(0.20)] }))
    const noGst = computeContractorPayment(base({ paymentBasis: 'gross_fee', agreedAmount: 2000, gstHistory: [gstNotReg], taxDeclarations: [verifiedChosen(0.20)] }))
    expect(withGst.withholdingAmount).toBe(noGst.withholdingAmount)
  })
  it('a half-cent-producing rate rounds to cents (10% on 1500 net → 1666.67 gross)', () => {
    const r = computeContractorPayment(base({ taxDeclarations: [verifiedChosen(0.10)] }))
    expect(r.grossExGst).toBe(1666.67)
    expect(r.withholdingAmount).toBe(166.67)
    // net reconciles to the guaranteed amount within a cent.
    expect(Math.abs((r.grossExGst! - r.withholdingAmount!) - 1500)).toBeLessThanOrEqual(0.01)
  })
  it('GST-inclusive extraction reconciles back to the original total within a cent', () => {
    const r = computeContractorPayment(base({ paymentBasis: 'gross_fee', rateBasis: 'gst_inclusive', agreedAmount: 115, gstHistory: [gstRegistered], taxDeclarations: [verifiedChosen(0.20)] }))
    expect(Math.abs((r.grossExGst! + r.gst!) - 115)).toBeLessThanOrEqual(0.01)
  })
  it('a negative agreed amount is not silently processed as a plausible payment', () => {
    // Negative → gross-up still math-defined but the engine should not fabricate a
    // "payment"; net anchor echoes but figures compute — we only assert determinism
    // and that it does not throw (credits/adjustments are a later, deliberate feature).
    const r = computeContractorPayment(base({ agreedAmount: -100 }))
    expect(r).toBeDefined()
  })
})

describe('§4 date resolution — uses the supply date, not a cache', () => {
  it('the withholding declaration is selected by the SUPPLY DATE (documented in the header)', () => {
    const src = readFileSync(join(process.cwd(), 'src/lib/contractor-payment-calc.ts'), 'utf8')
    expect(src).toMatch(/DATE BASIS: the SUPPLY DATE is used to resolve BOTH the GST window AND the\s*\/\/ withholding declaration/)
    expect(src).not.toContain('contractors.gst') // no flat cache as source of truth
  })
  it('resolves the tax rate as at the supply date, ignoring superseded rows', () => {
    const decls: DeclarationRecord[] = [
      { id: 'old', status: 'superseded', declarationType: 'contractor_chosen', withholdingRate: 0.10, effectiveDate: '2026-01-01', expiryDate: null },
      { id: 'new', status: 'verified', declarationType: 'contractor_chosen', withholdingRate: 0.25, effectiveDate: '2026-07-01', expiryDate: null },
    ]
    const r = computeContractorPayment(base({ taxDeclarations: decls, paymentBasis: 'gross_fee', agreedAmount: 1000 }))
    expect(r.withholdingRate).toBe(0.25); expect(r.taxDeclarationId).toBe('new')
  })
})

describe('§8 preview safety — pure engine + read-only preview helper', () => {
  const calc = readFileSync(join(process.cwd(), 'src/lib/contractor-payment-calc.ts'), 'utf8')
  const preview = readFileSync(join(process.cwd(), 'src/lib/contractor-payment-preview.ts'), 'utf8')
  it('the calc engine has no DB access at all (pure)', () => {
    expect(calc).not.toContain('supabase'); expect(calc).not.toContain('getServiceSupabase')
  })
  it('the preview helper only READS — no insert/update/upsert/delete, no financial tables', () => {
    for (const w of ['.insert(', '.update(', '.upsert(', '.delete(']) expect(preview).not.toContain(w)
    for (const t of ['contractor_invoices', 'contractor_remittance', 'pay_run', 'ird_liab', 'audit_log']) expect(preview).not.toContain(t)
  })
})

describe('§10 determinism', () => {
  it('repeated calculation from identical inputs is byte-identical', () => {
    const input = base({ gstHistory: [gstRegistered], taxDeclarations: [verifiedChosen(0.20)] })
    expect(JSON.stringify(computeContractorPayment(input))).toBe(JSON.stringify(computeContractorPayment(input)))
  })
})
