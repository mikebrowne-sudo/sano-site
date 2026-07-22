/** @jest-environment node */

import { recomputeStatementTotals } from '@/lib/contractor-statement-recompute'

describe('recomputeStatementTotals', () => {
  it('recomputes subtotal/total_payable from lines and gst_total from applied-only', async () => {
    const lines = [
      { amount: 315, gst_status: 'not_assessed', gst_amount: null },
      { amount: 245, gst_status: 'applied', gst_amount: 30 },
    ]
    const updateSpy = jest.fn().mockReturnValue({ eq: async () => ({ error: null }) })
    const from = jest.fn((t: string) => {
      if (t === 'contractor_invoices') return { select: () => ({ eq: async () => ({ data: lines }) }) }
      if (t === 'contractor_statements') return { update: (p: unknown) => { updateSpy(p); return { eq: async () => ({ error: null }) } } }
      return {}
    })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await recomputeStatementTotals({ from } as any, 'st1')
    expect(updateSpy).toHaveBeenCalledWith(expect.objectContaining({ subtotal: 560, total_payable: 560, gst_total: 30 }))
  })

  it('handles an empty statement (all lines removed) → zeroes', async () => {
    const updateSpy = jest.fn().mockReturnValue({ eq: async () => ({ error: null }) })
    const from = jest.fn((t: string) => {
      if (t === 'contractor_invoices') return { select: () => ({ eq: async () => ({ data: [] }) }) }
      if (t === 'contractor_statements') return { update: (p: unknown) => { updateSpy(p); return { eq: async () => ({ error: null }) } } }
      return {}
    })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await recomputeStatementTotals({ from } as any, 'st1')
    expect(updateSpy).toHaveBeenCalledWith(expect.objectContaining({ subtotal: 0, total_payable: 0, gst_total: 0 }))
  })
})
