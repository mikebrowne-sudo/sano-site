import {
  buildContractorPayData,
  type RawContractorInvoice,
} from '@/app/contractor/_lib/contractor-pay-statement'

function ci(over: Partial<RawContractorInvoice> & { id: string }): RawContractorInvoice {
  return {
    amount: 100,
    status: 'approved',
    date_paid: null,
    date_submitted: '2026-06-10',
    jobId: 'j-' + over.id,
    jobNumber: 'JOB-' + over.id,
    title: 'Clean',
    jobCompletedAt: '2026-06-10',
    jobDeletedAt: null,
    ...over,
  }
}

const empty = { cis: [], remLinks: [], rems: [], legacyItems: [], legacyTokens: [] }

describe('buildContractorPayData', () => {
  it('approved unpaid CIs make up the pending total', () => {
    const out = buildContractorPayData({ ...empty, cis: [ci({ id: '1', amount: 80, status: 'approved' }), ci({ id: '2', amount: 120, status: 'approved' })] })
    expect(out.pendingTotal).toBe(200)
    expect(out.pending).toHaveLength(2)
    expect(out.paidTotal).toBe(0)
  })

  it('paid CIs are counted in paid-to-date, not pending', () => {
    const out = buildContractorPayData({ ...empty, cis: [ci({ id: '1', amount: 150, status: 'paid', date_paid: '2026-06-12' })] })
    expect(out.paidTotal).toBe(150)
    expect(out.pendingTotal).toBe(0)
    expect(out.pending).toHaveLength(0)
  })

  it('includes payments made via the new contractor_remittance flow (paid CI grouped under its remittance doc)', () => {
    const out = buildContractorPayData({
      ...empty,
      cis: [ci({ id: 'a', amount: 200, status: 'paid', date_paid: '2026-06-15' })],
      remLinks: [{ ciId: 'a', remittanceId: 'R1' }],
      rems: [{ id: 'R1', token: 'tok123', paymentDate: '2026-06-15' }],
    })
    expect(out.paidTotal).toBe(200)
    expect(out.paidBatches).toHaveLength(1)
    expect(out.paidBatches[0].docHref).toBe('/remittance-batch/tok123')
    expect(out.paidBatches[0].payDate).toBe('2026-06-15')
  })

  it('does NOT double-count a remittance-linked payment (sums the CI once, never the remittance item)', () => {
    // Two paid CIs in the same remittance → one batch, total = sum of CIs.
    const out = buildContractorPayData({
      ...empty,
      cis: [
        ci({ id: 'a', amount: 100, status: 'paid', date_paid: '2026-06-15' }),
        ci({ id: 'b', amount: 50, status: 'paid', date_paid: '2026-06-15' }),
      ],
      remLinks: [{ ciId: 'a', remittanceId: 'R1' }, { ciId: 'b', remittanceId: 'R1' }],
      rems: [{ id: 'R1', token: 't', paymentDate: '2026-06-15' }],
    })
    expect(out.paidTotal).toBe(150)
    expect(out.paidBatches).toHaveLength(1)
    expect(out.paidBatches[0].jobCount).toBe(2)
  })

  it('keeps legacy paid pay runs in the total without double-counting new remittances', () => {
    const out = buildContractorPayData({
      cis: [ci({ id: 'a', amount: 100, status: 'paid', date_paid: '2026-06-15' })],
      remLinks: [{ ciId: 'a', remittanceId: 'R1' }],
      rems: [{ id: 'R1', token: 't', paymentDate: '2026-06-15' }],
      legacyItems: [{ payRunId: 'PR1', payDate: '2026-03-01', kind: 'contractor', amount: 60 }],
      legacyTokens: [{ payRunId: 'PR1', token: 'legacytok' }],
    })
    expect(out.paidTotal).toBe(160) // 100 (new) + 60 (legacy)
    expect(out.paidBatches).toHaveLength(2)
    const legacy = out.paidBatches.find((b) => b.id === 'payrun:PR1')!
    expect(legacy.docHref).toBe('/remittance/legacytok')
  })

  it('ignores non-contractor legacy pay runs', () => {
    const out = buildContractorPayData({ ...empty, legacyItems: [{ payRunId: 'PR9', payDate: '2026-01-01', kind: 'staff', amount: 999 }] })
    expect(out.paidTotal).toBe(0)
    expect(out.paidBatches).toHaveLength(0)
  })

  it('a not-yet-approved (pending) CI is neither pending-pay nor paid', () => {
    const out = buildContractorPayData({ ...empty, cis: [ci({ id: '1', amount: 100, status: 'pending' })] })
    expect(out.pendingTotal).toBe(0)
    expect(out.paidTotal).toBe(0)
  })

  it('drops payables for archived jobs', () => {
    const out = buildContractorPayData({ ...empty, cis: [ci({ id: '1', amount: 100, status: 'approved', jobDeletedAt: '2026-06-11' })] })
    expect(out.pendingTotal).toBe(0)
    expect(out.pending).toHaveLength(0)
  })

  it('paid CI without a remittance document groups by paid date with no link', () => {
    const out = buildContractorPayData({ ...empty, cis: [ci({ id: '1', amount: 90, status: 'paid', date_paid: '2026-06-20' })] })
    expect(out.paidTotal).toBe(90)
    expect(out.paidBatches[0].docHref).toBeNull()
    expect(out.paidBatches[0].payDate).toBe('2026-06-20')
  })
})
