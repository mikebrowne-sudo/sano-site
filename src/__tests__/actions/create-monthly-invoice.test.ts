/** @jest-environment node */

jest.mock('@/lib/supabase-server')
jest.mock('@/lib/is-admin', () => ({ isAdminUser: () => true }))
jest.mock('next/cache', () => ({ revalidatePath: jest.fn() }))
jest.mock('next/navigation', () => ({ redirect: jest.fn() }))

import { createMonthlyInvoice } from '@/app/portal/invoices/monthly/_actions'
import { createClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'

const mockedCreate = createClient as unknown as jest.Mock

const job = (id: string, date: string, extra: Record<string, unknown> = {}) => ({
  id, job_number: id.toUpperCase(), client_id: 'cl1', status: 'completed', payment_status: 'on_account',
  invoice_id: null, deleted_at: null, scheduled_date: date, completed_at: `${date}T20:00:00Z`,
  allowed_hours: '7.00', job_price: null, address: '157 Celtic Crescent', ...extra,
})

function makeSupabase(jobs: Record<string, unknown>[], opts: { linkFailsFor?: string } = {}) {
  const invoiceInsert = jest.fn().mockReturnValue({
    select: () => ({ single: jest.fn().mockResolvedValue({ data: { id: 'inv1', invoice_number: 'INV-0500' }, error: null }) }),
  })
  const invoiceDelete = jest.fn().mockReturnValue({ eq: jest.fn().mockResolvedValue({ error: null }) })
  const jobUpdates: Array<{ id: string; update: Record<string, unknown> }> = []
  const auditInsert = jest.fn().mockResolvedValue({ error: null })

  const from = jest.fn((table: string) => {
    if (table === 'clients') {
      return { select: () => ({ eq: () => ({ maybeSingle: jest.fn().mockResolvedValue({ data: {
        id: 'cl1', is_archived: false, service_address: 'x', payment_type: 'on_account', payment_terms: null,
      } }) }) }) }
    }
    if (table === 'jobs') {
      return {
        select: () => ({ in: jest.fn().mockResolvedValue({ data: jobs, error: null }) }),
        update: (update: Record<string, unknown>) => ({
          eq: (_c: string, id: string) => {
            jobUpdates.push({ id, update })
            const fail = opts.linkFailsFor === id
            return {
              is: () => ({ select: () => ({ maybeSingle: jest.fn().mockResolvedValue({ data: fail ? null : { id } }) }) }),
              then: (r: (v: unknown) => void) => r({ error: null }),
            }
          },
        }),
      }
    }
    if (table === 'contacts') {
      return { select: () => ({ eq: () => ({ eq: () => ({ maybeSingle: jest.fn().mockResolvedValue({ data: { id: 'ct1', full_name: 'Kelsey Harvey', email: 'kelsey@example.com' } }) }) }) }) }
    }
    if (table === 'invoices') return { insert: invoiceInsert, delete: invoiceDelete }
    if (table === 'audit_log') return { insert: auditInsert }
    return {}
  })

  return {
    client: { from, auth: { getUser: jest.fn().mockResolvedValue({ data: { user: { id: 'u1', email: 'a@sano.nz' } } }) } },
    invoiceInsert, invoiceDelete, jobUpdates, auditInsert,
  }
}

const base = { clientId: 'cl1', month: '2026-08', ratePerVisit: 315, serviceLabel: 'Residential Housekeeping' }

beforeEach(() => { mockedCreate.mockReset(); (redirect as unknown as jest.Mock).mockReset() })

describe('createMonthlyInvoice', () => {
  it('creates one draft invoice for the month and links every visit', async () => {
    const jobs = [job('j1', '2026-08-12'), job('j2', '2026-08-14'), job('j3', '2026-08-26', { job_price: '315.00' })]
    const s = makeSupabase(jobs)
    mockedCreate.mockReturnValue(s.client)

    await createMonthlyInvoice({ ...base, jobIds: ['j1', 'j2', 'j3'], notes: '  Contract rate: $630.00 + GST per week  ' })

    const payload = s.invoiceInsert.mock.calls[0][0]
    expect(payload).toMatchObject({
      client_id: 'cl1', job_id: null, quote_id: null, status: 'draft', source: 'job',
      base_price: 945, gst_included: false, payment_type: 'on_account', type_of_clean: 'Residential Housekeeping',
      scheduled_clean_date: '2026-08-26',
      notes: 'Contract rate: $630.00 + GST per week',
      contact_id: 'ct1', contact_name: 'Kelsey Harvey', contact_email: 'kelsey@example.com',
    })
    expect(payload.service_description).toBe(
      'August 2026: 3 visits × $315.00 + GST\nVisit dates: 12, 14 and 26 August',
    )
    // Every job linked + invoiced; only the unpriced ones get the rate stamped.
    expect(s.jobUpdates.map((u) => u.id)).toEqual(['j1', 'j2', 'j3'])
    expect(s.jobUpdates[0].update).toMatchObject({ invoice_id: 'inv1', status: 'invoiced', job_price: 315 })
    expect(s.jobUpdates[2].update).not.toHaveProperty('job_price')
    expect(s.auditInsert).toHaveBeenCalled()
    expect(redirect).toHaveBeenCalledWith('/portal/invoices/inv1')
  })

  it('GST-inclusive prices and a prepaid client still give a valid on-account invoice', async () => {
    const s = makeSupabase([job('j1', '2026-08-12')])
    mockedCreate.mockReturnValue(s.client)
    await createMonthlyInvoice({ ...base, ratePerVisit: 180, gstIncluded: true, jobIds: ['j1'] })
    const payload = s.invoiceInsert.mock.calls[0][0]
    expect(payload).toMatchObject({ gst_included: true, base_price: 180, payment_type: 'on_account' })
    expect(payload.service_description).toContain('1 visit × $180.00 incl. GST')
  })

  it.each([
    ['another client', { client_id: 'cl2' }, 'belongs to a different client'],
    ['already invoiced', { invoice_id: 'other' }, 'already on an invoice'],
    ['not completed', { status: 'assigned' }, "isn't completed yet"],
    ['archived', { deleted_at: '2026-09-01' }, 'is archived'],
  ])('refuses a job from %s', async (_n, extra, msg) => {
    const s = makeSupabase([job('j1', '2026-08-12', extra)])
    mockedCreate.mockReturnValue(s.client)
    const res = await createMonthlyInvoice({ ...base, jobIds: ['j1'] })
    expect(res).toEqual({ error: expect.stringContaining(msg) })
    expect(s.invoiceInsert).not.toHaveBeenCalled()
  })

  it('refuses a visit outside the chosen month', async () => {
    const s = makeSupabase([job('j1', '2026-09-02')])
    mockedCreate.mockReturnValue(s.client)
    const res = await createMonthlyInvoice({ ...base, jobIds: ['j1'] })
    expect(res).toEqual({ error: "J1 isn't in August 2026." })
    expect(s.invoiceInsert).not.toHaveBeenCalled()
  })

  it('refuses unpriced visits when no rate is given', async () => {
    const s = makeSupabase([job('j1', '2026-08-12')])
    mockedCreate.mockReturnValue(s.client)
    const res = await createMonthlyInvoice({ ...base, ratePerVisit: null, jobIds: ['j1'] })
    expect(res).toEqual({ error: expect.stringContaining('No price for J1') })
    expect(s.invoiceInsert).not.toHaveBeenCalled()
  })

  it('rolls back if a job gets invoiced elsewhere mid-way', async () => {
    const s = makeSupabase([job('j1', '2026-08-12'), job('j2', '2026-08-14')], { linkFailsFor: 'j2' })
    mockedCreate.mockReturnValue(s.client)
    const res = await createMonthlyInvoice({ ...base, jobIds: ['j1', 'j2'] })
    expect(res).toEqual({ error: expect.stringContaining('J2 was invoiced by someone else') })
    // j1 restored to its original state, invoice removed.
    const restore = s.jobUpdates.filter((u) => u.id === 'j1')[1]
    expect(restore.update).toMatchObject({ invoice_id: null, status: 'completed', payment_status: 'on_account', job_price: null })
    expect(s.invoiceDelete).toHaveBeenCalled()
    expect(redirect).not.toHaveBeenCalled()
  })
})
