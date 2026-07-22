/** @jest-environment node */

import { billingPeriodLabel, ensureContractorPayable, type RecurringRow } from '@/app/portal/recurring-jobs/_lib/generate-recurring-invoice'

describe('billingPeriodLabel', () => {
  it('maps a billing date to a month label', () => {
    expect(billingPeriodLabel('2026-07-31')).toBe('July 2026')
    expect(billingPeriodLabel('2026-12-01')).toBe('December 2026')
    expect(billingPeriodLabel('2027-02-28')).toBe('February 2027')
  })
})

const rec = (over: Partial<RecurringRow> = {}): RecurringRow => ({
  id: 'rj1', client_id: 'cl1', monthly_value: 2740, title: 'Pukekohe Golf Club',
  description: null, address: null, status: 'active', invoice_auto_send: true,
  invoice_send_day: 31, next_invoice_date: '2026-07-31',
  contractor_id: 'myrtle', contractor_monthly_pay: 1500, ...over,
})

function makeSupabase(existing: { id: string } | null) {
  const insertCi = jest.fn().mockReturnValue({ select: () => ({ single: async () => ({ data: { id: 'ci1', invoice_number: 'CI-0100' }, error: null }) }) })
  const auditInsert = jest.fn().mockResolvedValue({ error: null })
  const from = jest.fn((t: string) => {
    if (t === 'contractor_invoices') return {
      select: () => ({ eq: () => ({ eq: () => ({ eq: () => ({ eq: () => ({ neq: () => ({ limit: () => ({ maybeSingle: async () => ({ data: existing }) }) }) }) }) }) }) }),
      insert: insertCi,
    }
    if (t === 'contractors') return { select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: { gst_registered: false, gst_number: null, gst_effective_date: null, gst_end_date: null, tax_treatment: null } }) }) }) }
    if (t === 'audit_log') return { insert: auditInsert }
    return {}
  })
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return { supabase: { from } as any, insertCi, auditInsert }
}

describe('ensureContractorPayable', () => {
  it('skips when the contract has no contractor pay', async () => {
    const { supabase } = makeSupabase(null)
    expect(await ensureContractorPayable(supabase, rec({ contractor_monthly_pay: null }), '2026-07-31')).toMatchObject({ skipped: expect.any(String) })
  })

  it('is idempotent — skips when a payable already exists for the period', async () => {
    const { supabase, insertCi } = makeSupabase({ id: 'existing' })
    const res = await ensureContractorPayable(supabase, rec(), '2026-07-31')
    expect(res).toMatchObject({ skipped: expect.stringMatching(/already exists/i) })
    expect(insertCi).not.toHaveBeenCalled()
  })

  it('creates an approved fixed-contract payable for the month', async () => {
    const { supabase, insertCi, auditInsert } = makeSupabase(null)
    const res = await ensureContractorPayable(supabase, rec(), '2026-07-31')
    expect(res).toMatchObject({ created: true })
    const row = insertCi.mock.calls[0][0]
    expect(row).toMatchObject({
      contractor_id: 'myrtle', amount: 1500, status: 'approved',
      payment_type: 'fixed_contract', site_label: 'Pukekohe Golf Club', period_label: 'July 2026',
      service_date: '2026-07-31',
    })
    expect(auditInsert).toHaveBeenCalled()
  })
})
