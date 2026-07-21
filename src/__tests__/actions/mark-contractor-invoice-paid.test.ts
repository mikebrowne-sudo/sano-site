/** @jest-environment node */

// Stage 0 PR F — marking a contractor payable paid is a money-status change and
// must leave an audit trail (before-state + who + when), and must fail cleanly
// when the payable doesn't exist rather than silently updating nothing.

jest.mock('@/lib/supabase-server')
jest.mock('next/navigation', () => ({ redirect: jest.fn() }))
jest.mock('next/cache', () => ({ revalidatePath: jest.fn() }))
jest.mock('@/lib/is-admin', () => ({ isAdminUser: (u: { email?: string } | null) => u?.email === 'admin@sano.nz' }))

import { markContractorInvoicePaid } from '@/app/portal/contractor-invoices/_actions'
import { createClient } from '@/lib/supabase-server'

const mockedCreate = createClient as unknown as jest.Mock

function makeClient(before: Record<string, unknown> | null) {
  const auditInsert = jest.fn().mockResolvedValue({ error: null })
  const update = jest.fn().mockReturnValue({ eq: jest.fn().mockResolvedValue({ error: null }) })
  const from = jest.fn((table: string) => {
    if (table === 'contractor_invoices') {
      return {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        maybeSingle: jest.fn().mockResolvedValue({ data: before, error: null }),
        update,
      }
    }
    if (table === 'audit_log') return { insert: auditInsert }
    return { select: jest.fn().mockReturnThis(), eq: jest.fn().mockReturnThis(), maybeSingle: jest.fn().mockResolvedValue({ data: null }) }
  })
  return {
    client: { from, auth: { getUser: jest.fn().mockResolvedValue({ data: { user: { id: 'u-1', email: 'admin@sano.nz' } } }) } },
    spies: { auditInsert, update },
  }
}

beforeEach(() => mockedCreate.mockReset())

it('marks paid and writes an audit row with before/after state', async () => {
  const { client, spies } = makeClient({ id: 'ci-1', invoice_number: 'CI-0031', status: 'approved', date_paid: null, amount: 1500 })
  mockedCreate.mockReturnValue(client)

  const res = await markContractorInvoicePaid('ci-1')
  expect(res).toMatchObject({ success: true })

  expect(spies.update).toHaveBeenCalledWith(expect.objectContaining({ status: 'paid' }))
  const audit = spies.auditInsert.mock.calls[0][0]
  expect(audit.action).toBe('contractor_invoice.marked_paid')
  expect(audit.entity_id).toBe('ci-1')
  expect(audit.before).toMatchObject({ status: 'approved', date_paid: null })
  expect(audit.after).toMatchObject({ invoice_number: 'CI-0031', amount: 1500, status: 'paid' })
  expect(audit.after.date_paid).toBeTruthy()
})

it('fails cleanly (no update, no audit) when the payable does not exist', async () => {
  const { client, spies } = makeClient(null)
  mockedCreate.mockReturnValue(client)

  const res = await markContractorInvoicePaid('missing')
  expect(res).toMatchObject({ error: expect.stringContaining('not found') })
  expect(spies.update).not.toHaveBeenCalled()
  expect(spies.auditInsert).not.toHaveBeenCalled()
})

it('is admin-only', async () => {
  const from = jest.fn(() => ({ select: jest.fn().mockReturnThis(), eq: jest.fn().mockReturnThis(), maybeSingle: jest.fn().mockResolvedValue({ data: null }) }))
  mockedCreate.mockReturnValue({ from, auth: { getUser: jest.fn().mockResolvedValue({ data: { user: { id: 'u-2', email: 'staff@sano.nz' } } }) } })
  const res = await markContractorInvoicePaid('ci-1')
  expect(res).toMatchObject({ error: 'Admin only.' })
})
