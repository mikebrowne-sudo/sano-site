/** @jest-environment node */

jest.mock('@/lib/monthly-invoice-create', () => ({
  createMonthlyInvoiceCore: jest.fn(),
  defaultServiceLabel: jest.fn().mockResolvedValue('Residential Housekeeping'),
  scheduleInvoiceNote: jest.fn().mockResolvedValue('Contract rate: $630.00 + GST per week ($724.50 incl. GST)'),
}))
jest.mock('@/app/portal/recurring-jobs/_lib/send-recurring-invoice', () => ({
  sendRecurringInvoiceEmail: jest.fn(),
}))

import { generateFor, type RecurringRow } from '@/app/portal/recurring-jobs/_lib/generate-recurring-invoice'
import { createMonthlyInvoiceCore } from '@/lib/monthly-invoice-create'
import { sendRecurringInvoiceEmail } from '@/app/portal/recurring-jobs/_lib/send-recurring-invoice'
import { groupVisitsByMonth, periodLabel } from '@/lib/monthly-invoice'
import { nextMondayOnOrAfter } from '@/lib/recurring-invoice'

const core = createMonthlyInvoiceCore as jest.Mock
const send = sendRecurringInvoiceEmail as jest.Mock

type J = { id: string; scheduled_date: string | null; completed_at: string | null }

function makeSupabase(jobs: J[], opts: { weekly?: boolean; gstIncluded?: boolean; scheduleIds?: string[] } = {}) {
  const recUpdate = jest.fn().mockReturnValue({ eq: jest.fn().mockResolvedValue({ error: null }) })
  const jobFilters: Record<string, unknown> = {}
  const jobsQuery: Record<string, unknown> = {
    select: () => jobsQuery,
    eq: () => jobsQuery,
    is: () => jobsQuery,
    in: (col: string, v: unknown) => { jobFilters[col] = v; return jobsQuery },
    then: (r: (v: unknown) => void) => r({ data: jobs, error: null }),
  }
  const from = jest.fn((t: string) => {
    if (t === 'jobs') return jobsQuery
    if (t === 'recurring_jobs') {
      return {
        update: recUpdate,
        select: (cols: string) => {
          if (cols.includes('invoice_frequency')) {
            return {
              eq: () => ({
                maybeSingle: jest.fn().mockResolvedValue({
                  data: { invoice_frequency: opts.weekly ? 'weekly' : 'monthly', rate_includes_gst: !!opts.gstIncluded },
                  error: null,
                }),
              }),
            }
          }
          // The client's completed-visits schedules.
          const q: Record<string, unknown> = {
            eq: () => q,
            then: (r: (v: unknown) => void) => r({ data: (opts.scheduleIds ?? ['rec1', 'rec2']).map((id) => ({ id })), error: null }),
          }
          return q
        },
      }
    }
    return {}
  })
  return { client: { from } as never, recUpdate, jobFilters }
}

const REC: RecurringRow = {
  id: 'rec1', client_id: 'cl1', monthly_value: null, title: 'OT — Celtic (Wednesdays)', description: null,
  address: null, status: 'active', invoice_auto_send: true, invoice_send_day: 1, next_invoice_date: '2026-11-01',
  contractor_id: 'c1', contractor_monthly_pay: null, bill_in_arrears: false, billing_mode: 'completed_visits',
  per_visit_rate: 315, service_days_of_week: null, contractor_pay_mode: 'fixed',
}

beforeEach(() => { core.mockReset(); send.mockReset() })

describe('helpers', () => {
  it('groupVisitsByMonth groups and cuts off', () => {
    const g = groupVisitsByMonth([
      { id: 'late-sep', scheduled_date: '2026-09-30', completed_at: '2026-10-03T00:00:00Z' },
      { id: 'oct1', scheduled_date: '2026-10-02', completed_at: null },
      { id: 'nov', scheduled_date: '2026-11-04', completed_at: null },
    ], '2026-10-31')
    expect(Array.from(g.entries())).toEqual([['2026-09', ['late-sep']], ['2026-10', ['oct1']]])
  })

  it('nextMondayOnOrAfter', () => {
    expect(nextMondayOnOrAfter('2026-09-30')).toBe('2026-10-05') // Wed → Mon
    expect(nextMondayOnOrAfter('2026-10-05')).toBe('2026-10-05') // Mon → same day
    expect(nextMondayOnOrAfter('2026-10-04')).toBe('2026-10-05') // Sun → next day
  })

  it('periodLabel', () => {
    expect(periodLabel('2026-10-05', '2026-10-11')).toBe('Week of 5–11 October 2026')
    expect(periodLabel('2026-09-28', '2026-10-04')).toBe('Week of 28 September – 4 October 2026')
    expect(periodLabel('2026-12-28', '2027-01-03')).toBe('Week of 28 December 2026 – 3 January 2027')
    expect(periodLabel('2026-09-22', '2026-10-04')).toBe('22 September – 4 October 2026')
  })
})

describe('completed_visits — monthly', () => {
  it("bills last month's visits on the client's schedules, auto-sends, advances a month", async () => {
    const { client, recUpdate, jobFilters } = makeSupabase([
      { id: 'j1', scheduled_date: '2026-10-02', completed_at: null },
      { id: 'j2', scheduled_date: '2026-10-07', completed_at: null },
      { id: 'jNov', scheduled_date: '2026-11-04', completed_at: null },
    ])
    core.mockResolvedValue({ invoiceId: 'inv1', invoiceNumber: 'INV-0600', total: 630, visits: 2 })
    send.mockResolvedValue({ sent: true })

    const res = await generateFor(client, REC)

    expect(jobFilters.recurring_job_id).toEqual(['rec1', 'rec2'])
    expect(core).toHaveBeenCalledTimes(1)
    expect(core.mock.calls[0][1]).toMatchObject({
      clientId: 'cl1', month: '2026-10', jobIds: ['j1', 'j2'], ratePerVisit: 315, gstIncluded: false,
      serviceLabel: 'Residential Housekeeping', recurringJobId: 'rec1', actor: { id: null, role: 'system' },
      notes: 'Contract rate: $630.00 + GST per week ($724.50 incl. GST)', issueDate: '2026-11-01',
    })
    expect(send).toHaveBeenCalledWith(client, 'inv1')
    expect(recUpdate).toHaveBeenCalledWith({ next_invoice_date: '2026-12-01' })
    expect(res).toEqual({ invoiceId: 'inv1', sent: true })
  })

  it('one invoice per month when older visits are unbilled', async () => {
    const { client } = makeSupabase([
      { id: 'sep', scheduled_date: '2026-09-30', completed_at: null },
      { id: 'oct', scheduled_date: '2026-10-02', completed_at: null },
    ])
    core.mockResolvedValue({ invoiceId: 'a', invoiceNumber: null, total: 315, visits: 1 })
    send.mockResolvedValue({ sent: true })
    await generateFor(client, REC)
    expect(core.mock.calls.map((c) => c[1].month)).toEqual(['2026-09', '2026-10'])
  })

  it('draft only when auto-send is off', async () => {
    const { client } = makeSupabase([{ id: 'j1', scheduled_date: '2026-10-02', completed_at: null }])
    core.mockResolvedValue({ invoiceId: 'inv1', invoiceNumber: null, total: 315, visits: 1 })
    await generateFor(client, { ...REC, invoice_auto_send: false })
    expect(send).not.toHaveBeenCalled()
  })

  it('skips but advances when nothing to bill', async () => {
    const { client, recUpdate } = makeSupabase([])
    expect(await generateFor(client, REC)).toEqual({ skipped: 'no completed visits to bill' })
    expect(recUpdate).toHaveBeenCalled()
  })

  it('needs a rate', async () => {
    const { client } = makeSupabase([])
    expect(await generateFor(client, { ...REC, per_visit_rate: null })).toEqual({ skipped: 'no per-visit rate' })
  })

  it('reports a failed send without losing the invoice', async () => {
    const { client } = makeSupabase([{ id: 'j1', scheduled_date: '2026-10-02', completed_at: null }])
    core.mockResolvedValue({ invoiceId: 'inv1', invoiceNumber: null, total: 315, visits: 1 })
    send.mockResolvedValue({ error: 'no client email on file' })
    expect(await generateFor(client, REC)).toMatchObject({ invoiceId: 'inv1', sent: false, error: expect.stringContaining('not sent') })
  })
})

describe('completed_visits — weekly (Mondays), GST-inclusive', () => {
  const BELLA: RecurringRow = { ...REC, id: 'bella', client_id: 'cl2', per_visit_rate: 180, invoice_send_day: null, next_invoice_date: '2026-10-05' }

  it('bills the previous Mon–Sun week at the incl-GST rate and advances 7 days', async () => {
    const { client, recUpdate } = makeSupabase(
      [
        { id: 'tue', scheduled_date: '2026-09-29', completed_at: null },
        { id: 'next', scheduled_date: '2026-10-06', completed_at: null },
      ],
      { weekly: true, gstIncluded: true, scheduleIds: ['bella'] },
    )
    core.mockResolvedValue({ invoiceId: 'w1', invoiceNumber: null, total: 180, visits: 1 })
    send.mockResolvedValue({ sent: true })

    await generateFor(client, BELLA)

    expect(core).toHaveBeenCalledTimes(1)
    expect(core.mock.calls[0][1]).toMatchObject({
      period: { start: '2026-09-28', end: '2026-10-04', label: 'Week of 28 September – 4 October 2026' },
      jobIds: ['tue'], ratePerVisit: 180, gstIncluded: true, issueDate: '2026-10-05',
    })
    expect(core.mock.calls[0][1].month).toBeUndefined()
    expect(recUpdate).toHaveBeenCalledWith({ next_invoice_date: '2026-10-12' })
  })

  it('folds older stragglers into one invoice with a widened label', async () => {
    const { client } = makeSupabase(
      [
        { id: 'straggler', scheduled_date: '2026-09-22', completed_at: null },
        { id: 'tue', scheduled_date: '2026-09-29', completed_at: null },
      ],
      { weekly: true, gstIncluded: true, scheduleIds: ['bella'] },
    )
    core.mockResolvedValue({ invoiceId: 'w1', invoiceNumber: null, total: 360, visits: 2 })
    send.mockResolvedValue({ sent: true })
    await generateFor(client, BELLA)
    expect(core.mock.calls[0][1]).toMatchObject({
      period: { start: '2026-09-22', end: '2026-10-04', label: '22 September – 4 October 2026' },
      jobIds: ['straggler', 'tue'],
    })
  })
})
