/** @jest-environment node */

jest.mock('@/lib/monthly-invoice-create', () => ({
  createMonthlyInvoiceCore: jest.fn(),
  defaultServiceLabel: jest.fn().mockResolvedValue('Residential Housekeeping'),
}))
jest.mock('@/app/portal/recurring-jobs/_lib/send-recurring-invoice', () => ({
  sendRecurringInvoiceEmail: jest.fn(),
}))

import { generateFor, type RecurringRow } from '@/app/portal/recurring-jobs/_lib/generate-recurring-invoice'
import { createMonthlyInvoiceCore } from '@/lib/monthly-invoice-create'
import { sendRecurringInvoiceEmail } from '@/app/portal/recurring-jobs/_lib/send-recurring-invoice'
import { groupVisitsByMonth } from '@/lib/monthly-invoice'

const core = createMonthlyInvoiceCore as jest.Mock
const send = sendRecurringInvoiceEmail as jest.Mock

function makeSupabase(jobs: Array<{ id: string; scheduled_date: string | null; completed_at: string | null }>) {
  const recUpdate = jest.fn().mockReturnValue({ eq: jest.fn().mockResolvedValue({ error: null }) })
  const jobsQuery = {
    select: () => jobsQuery, eq: () => jobsQuery, is: () => jobsQuery,
    then: (r: (v: unknown) => void) => r({ data: jobs, error: null }),
  }
  const from = jest.fn((t: string) => {
    if (t === 'jobs') return jobsQuery
    if (t === 'recurring_jobs') return { update: recUpdate }
    return {}
  })
  return { client: { from } as never, recUpdate }
}

const REC: RecurringRow = {
  id: 'rec1', client_id: 'cl1', monthly_value: null, title: 'OT — Celtic (Wednesdays)', description: null,
  address: null, status: 'active', invoice_auto_send: true, invoice_send_day: 1, next_invoice_date: '2026-11-01',
  contractor_id: 'c1', contractor_monthly_pay: null, bill_in_arrears: false, billing_mode: 'completed_visits',
  per_visit_rate: 315, service_days_of_week: null, contractor_pay_mode: 'fixed',
}

beforeEach(() => { core.mockReset(); send.mockReset() })

describe('groupVisitsByMonth', () => {
  it('groups by visit month and drops anything after the cut-off', () => {
    const g = groupVisitsByMonth([
      { id: 'late-sep', scheduled_date: '2026-09-30', completed_at: '2026-10-03T00:00:00Z' },
      { id: 'oct1', scheduled_date: '2026-10-02', completed_at: null },
      { id: 'nov', scheduled_date: '2026-11-04', completed_at: null },
      { id: 'oct2', scheduled_date: '2026-10-07', completed_at: null },
    ], '2026-10-31')
    expect(Array.from(g.entries())).toEqual([['2026-09', ['late-sep']], ['2026-10', ['oct1', 'oct2']]])
  })
})

describe("generateFor — billing_mode 'completed_visits'", () => {
  it("bills last month's completed visits, auto-sends, and advances the date", async () => {
    const { client, recUpdate } = makeSupabase([
      { id: 'j1', scheduled_date: '2026-10-02', completed_at: '2026-10-02T20:00:00Z' },
      { id: 'j2', scheduled_date: '2026-10-07', completed_at: '2026-10-07T20:00:00Z' },
      { id: 'jNov', scheduled_date: '2026-11-04', completed_at: '2026-11-04T20:00:00Z' },
    ])
    core.mockResolvedValue({ invoiceId: 'inv1', invoiceNumber: 'INV-0600', total: 630, visits: 2 })
    send.mockResolvedValue({ sent: true })

    const res = await generateFor(client, REC)

    expect(core).toHaveBeenCalledTimes(1)
    expect(core.mock.calls[0][1]).toMatchObject({
      clientId: 'cl1', month: '2026-10', jobIds: ['j1', 'j2'], ratePerVisit: 315,
      serviceLabel: 'Residential Housekeeping', recurringJobId: 'rec1', actor: { id: null, role: 'system' },
    })
    expect(send).toHaveBeenCalledWith(client, 'inv1')
    expect(recUpdate).toHaveBeenCalledWith({ next_invoice_date: '2026-12-01' })
    expect(res).toEqual({ invoiceId: 'inv1', sent: true })
  })

  it('raises a separate invoice per month when older visits are still unbilled', async () => {
    const { client } = makeSupabase([
      { id: 'sep', scheduled_date: '2026-09-30', completed_at: '2026-10-03T00:00:00Z' },
      { id: 'oct', scheduled_date: '2026-10-02', completed_at: null },
    ])
    core.mockResolvedValueOnce({ invoiceId: 'a', invoiceNumber: null, total: 315, visits: 1 })
      .mockResolvedValueOnce({ invoiceId: 'b', invoiceNumber: null, total: 315, visits: 1 })
    send.mockResolvedValue({ sent: true })
    await generateFor(client, REC)
    expect(core.mock.calls.map((c) => c[1].month)).toEqual(['2026-09', '2026-10'])
  })

  it('leaves a draft (no send) when auto-send is off', async () => {
    const { client } = makeSupabase([{ id: 'j1', scheduled_date: '2026-10-02', completed_at: null }])
    core.mockResolvedValue({ invoiceId: 'inv1', invoiceNumber: null, total: 315, visits: 1 })
    await generateFor(client, { ...REC, invoice_auto_send: false })
    expect(send).not.toHaveBeenCalled()
  })

  it('skips (but still advances) when there is nothing to bill — e.g. the second schedule', async () => {
    const { client, recUpdate } = makeSupabase([])
    const res = await generateFor(client, REC)
    expect(core).not.toHaveBeenCalled()
    expect(recUpdate).toHaveBeenCalled()
    expect(res).toEqual({ skipped: 'no completed visits to bill' })
  })

  it('refuses to run without a per-visit rate', async () => {
    const { client } = makeSupabase([{ id: 'j1', scheduled_date: '2026-10-02', completed_at: null }])
    expect(await generateFor(client, { ...REC, per_visit_rate: null })).toEqual({ skipped: 'no per-visit rate' })
  })

  it('reports a failed send without losing the created invoice', async () => {
    const { client } = makeSupabase([{ id: 'j1', scheduled_date: '2026-10-02', completed_at: null }])
    core.mockResolvedValue({ invoiceId: 'inv1', invoiceNumber: null, total: 315, visits: 1 })
    send.mockResolvedValue({ error: 'no client email on file' })
    const res = await generateFor(client, REC)
    expect(res).toMatchObject({ invoiceId: 'inv1', sent: false, error: expect.stringContaining('not sent (no client email on file)') })
  })
})
