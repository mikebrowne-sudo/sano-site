/** @jest-environment node */

// PR A (Stage 0) — pay-rate snapshotting on addJobWorker + the explicit,
// audited setJobWorkerPayRate override.

jest.mock('@/lib/supabase-server')
jest.mock('next/cache', () => ({ revalidatePath: jest.fn() }))
jest.mock('@/lib/is-admin', () => ({ isAdminEmail: () => true }))

import { addJobWorker, setJobWorkerPayRate } from '@/app/portal/jobs/[id]/_actions-workers'
import { createClient } from '@/lib/supabase-server'

const mockedCreate = createClient as unknown as jest.Mock
const adminAuth = { getUser: jest.fn().mockResolvedValue({ data: { user: { id: 'u-1', email: 'admin@sano.nz' } } }) }

describe('addJobWorker — snapshots the contractor rate', () => {
  beforeEach(() => mockedCreate.mockReset())

  it('inserts job_workers with pay_rate snapshotted from the contractor + pay_type hourly', async () => {
    const jobWorkersInsert = jest.fn().mockResolvedValue({ error: null })
    const auditInsert = jest.fn().mockResolvedValue({ error: null })
    const from = jest.fn().mockImplementation((table: string) => {
      if (table === 'jobs') return { select: jest.fn().mockReturnThis(), eq: jest.fn().mockReturnThis(), single: jest.fn().mockResolvedValue({ data: { id: 'j-1', allowed_hours: 4 }, error: null }) }
      if (table === 'contractors') return { select: jest.fn().mockReturnThis(), eq: jest.fn().mockReturnThis(), single: jest.fn().mockResolvedValue({ data: { id: 'c-1', full_name: 'Test', hourly_rate: 50 }, error: null }) }
      if (table === 'job_workers') return { select: jest.fn().mockReturnThis(), eq: jest.fn().mockReturnThis(), maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }), insert: jobWorkersInsert }
      if (table === 'audit_log') return { insert: auditInsert }
      return { select: jest.fn().mockReturnThis(), eq: jest.fn().mockReturnThis(), maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }) }
    })
    mockedCreate.mockReturnValue({ from, auth: adminAuth })

    const res = await addJobWorker('j-1', 'c-1')
    expect(res).toEqual({ ok: true })
    expect(jobWorkersInsert).toHaveBeenCalledWith(expect.objectContaining({ job_id: 'j-1', contractor_id: 'c-1', pay_rate: 50, pay_type: 'hourly' }))
  })

  it('snapshots null (not 0) for a rate-less contractor — job-cost fallback still works', async () => {
    const jobWorkersInsert = jest.fn().mockResolvedValue({ error: null })
    const from = jest.fn().mockImplementation((table: string) => {
      if (table === 'jobs') return { select: jest.fn().mockReturnThis(), eq: jest.fn().mockReturnThis(), single: jest.fn().mockResolvedValue({ data: { id: 'j-1', allowed_hours: 4 }, error: null }) }
      if (table === 'contractors') return { select: jest.fn().mockReturnThis(), eq: jest.fn().mockReturnThis(), single: jest.fn().mockResolvedValue({ data: { id: 'c-1', full_name: 'Test', hourly_rate: null }, error: null }) }
      if (table === 'job_workers') return { select: jest.fn().mockReturnThis(), eq: jest.fn().mockReturnThis(), maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }), insert: jobWorkersInsert }
      return { insert: jest.fn().mockResolvedValue({ error: null }) }
    })
    mockedCreate.mockReturnValue({ from, auth: adminAuth })

    await addJobWorker('j-1', 'c-1')
    expect(jobWorkersInsert).toHaveBeenCalledWith(expect.objectContaining({ pay_rate: null }))
  })
})

describe('setJobWorkerPayRate — explicit audited override', () => {
  beforeEach(() => mockedCreate.mockReset())

  function makeClient(opts: { worker: Record<string, unknown>; ci?: Record<string, unknown> | null }) {
    const jwUpdateInner = jest.fn().mockReturnValue({ eq: jest.fn().mockResolvedValue({ error: null }) })
    const jwUpdate = jest.fn().mockReturnValue({ eq: jwUpdateInner })
    const auditInsert = jest.fn().mockResolvedValue({ error: null })
    const from = jest.fn().mockImplementation((table: string) => {
      if (table === 'job_workers') return { select: jest.fn().mockReturnThis(), eq: jest.fn().mockReturnThis(), single: jest.fn().mockResolvedValue({ data: opts.worker, error: null }), update: jwUpdate }
      if (table === 'contractor_invoices') return { select: jest.fn().mockReturnThis(), eq: jest.fn().mockReturnThis(), neq: jest.fn().mockReturnThis(), maybeSingle: jest.fn().mockResolvedValue({ data: opts.ci ?? null, error: null }) }
      if (table === 'audit_log') return { insert: auditInsert }
      return { select: jest.fn().mockReturnThis(), eq: jest.fn().mockReturnThis(), maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }) }
    })
    return { client: { from, auth: adminAuth }, spies: { jwUpdate, auditInsert } }
  }

  it('updates the rate and audits before → after with the reason', async () => {
    const { client, spies } = makeClient({ worker: { pay_rate: 40, pay_status: 'pending', contractors: { full_name: 'Test' } } })
    mockedCreate.mockReturnValue(client)

    const res = await setJobWorkerPayRate('j-1', 'c-1', 60, 'agreed uplift')
    expect(res).toEqual({ ok: true })
    // Rate-only update — must NOT force pay_type (don't flip a non-hourly arrangement)
    expect(spies.jwUpdate).toHaveBeenCalledWith({ pay_rate: 60 })
    expect(spies.auditInsert).toHaveBeenCalledWith(expect.objectContaining({
      action: 'job_worker.rate_changed',
      before: { pay_rate: 40 },
      after: expect.objectContaining({ pay_rate: 60, reason: 'agreed uplift' }),
    }))
  })

  it('requires a reason', async () => {
    const { client } = makeClient({ worker: { pay_rate: 40, pay_status: 'pending', contractors: { full_name: 'Test' } } })
    mockedCreate.mockReturnValue(client)
    const res = await setJobWorkerPayRate('j-1', 'c-1', 60, '   ')
    expect(res).toMatchObject({ error: expect.stringContaining('reason is required') })
  })

  it('is blocked when a non-void payable exists (rate frozen on the CI)', async () => {
    const { client, spies } = makeClient({ worker: { pay_rate: 40, pay_status: 'pending', contractors: { full_name: 'Test' } }, ci: { invoice_number: 'CI-0001' } })
    mockedCreate.mockReturnValue(client)
    const res = await setJobWorkerPayRate('j-1', 'c-1', 60, 'reason')
    expect(res).toMatchObject({ error: expect.stringContaining('CI-0001') })
    expect(spies.jwUpdate).not.toHaveBeenCalled()
  })

  it('is blocked once included in a pay run / paid', async () => {
    const { client, spies } = makeClient({ worker: { pay_rate: 40, pay_status: 'paid', contractors: { full_name: 'Test' } } })
    mockedCreate.mockReturnValue(client)
    const res = await setJobWorkerPayRate('j-1', 'c-1', 60, 'reason')
    expect(res).toMatchObject({ error: expect.stringContaining('locked') })
    expect(spies.jwUpdate).not.toHaveBeenCalled()
  })
})
