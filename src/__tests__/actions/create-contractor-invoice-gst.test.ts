/** @jest-environment node */

// Stage 0 PR E — manual contractor-invoice creation snapshots GST too, using
// the same resolver + the explicit supply date, and audits the treatment.

jest.mock('@/lib/supabase-server')
jest.mock('next/navigation', () => ({ redirect: jest.fn() }))
jest.mock('next/cache', () => ({ revalidatePath: jest.fn() }))
jest.mock('@/lib/is-admin', () => ({ isAdminUser: (u: { email?: string } | null) => u?.email === 'admin@sano.nz' }))

import { createContractorInvoice } from '@/app/portal/contractor-invoices/_actions'
import { createClient } from '@/lib/supabase-server'

const mockedCreate = createClient as unknown as jest.Mock

function makeClient(contractor: Record<string, unknown> | null) {
  const ciInsert = jest.fn().mockReturnValue({ select: jest.fn().mockReturnValue({ single: jest.fn().mockResolvedValue({ data: { id: 'ci-1', invoice_number: 'CI-0200' }, error: null }) }) })
  const auditInsert = jest.fn().mockResolvedValue({ error: null })
  const from = jest.fn((table: string) => {
    if (table === 'contractors') return { select: jest.fn().mockReturnThis(), eq: jest.fn().mockReturnThis(), maybeSingle: jest.fn().mockResolvedValue({ data: contractor, error: null }) }
    if (table === 'contractor_invoices') return { select: jest.fn().mockReturnThis(), eq: jest.fn().mockReturnThis(), limit: jest.fn().mockReturnThis(), maybeSingle: jest.fn().mockResolvedValue({ data: null }), insert: ciInsert }
    if (table === 'audit_log') return { insert: auditInsert }
    return { select: jest.fn().mockReturnThis(), eq: jest.fn().mockReturnThis(), maybeSingle: jest.fn().mockResolvedValue({ data: null }), insert: jest.fn().mockResolvedValue({ error: null }) }
  })
  return { client: { from, auth: { getUser: jest.fn().mockResolvedValue({ data: { user: { id: 'u-1', email: 'admin@sano.nz' } } }) } }, spies: { ciInsert, auditInsert } }
}

beforeEach(() => mockedCreate.mockReset())

it('snapshots GST (registered) at the explicit supply date + audits the treatment', async () => {
  const { client, spies } = makeClient({ gst_registered: true, gst_number: '123-456-789', gst_effective_date: '2026-04-01', gst_end_date: null, tax_treatment: 'ordinary_trade_creditor' })
  mockedCreate.mockReturnValue(client)
  await createContractorInvoice({ contractor_id: 'c1', amount: 230, date_submitted: '2026-07-01', gst_supply_date: '2026-05-10' })
  const row = spies.ciInsert.mock.calls[0][0]
  expect(row.amount).toBe(230) // full GST-inclusive preserved
  expect(row.gst_applied).toBe(true)
  expect(row.gst_amount).toBeCloseTo(30, 2)
  expect(row.gst_status).toBe('applied')
  expect(row.gst_supply_date).toBe('2026-05-10')
  const audit = spies.auditInsert.mock.calls.find((c) => c[0]?.action === 'contractor_invoice.created')
  expect(audit![0].after.gst).toMatchObject({ status: 'applied', supply_date: '2026-05-10' })
})

it('applies GST for a registered contractor even with the default pending_review treatment', async () => {
  // GST is independent of tax_treatment (withholding). The default treatment must
  // not suppress GST for a registered contractor with a number.
  const { client, spies } = makeClient({ gst_registered: true, gst_number: '123', gst_effective_date: '2026-04-01', gst_end_date: null, tax_treatment: 'pending_review' })
  mockedCreate.mockReturnValue(client)
  await createContractorInvoice({ contractor_id: 'c1', amount: 230, date_submitted: '2026-07-01', gst_supply_date: '2026-05-10' })
  const row = spies.ciInsert.mock.calls[0][0]
  expect(row.gst_applied).toBe(true)
  expect(row.gst_status).toBe('applied')
})
