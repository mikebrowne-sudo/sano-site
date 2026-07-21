/** @jest-environment node */

// Stage 0 PR B — updateJob must reconcile job_workers with a non-destructive
// add/update/remove diff, never a delete+recreate. These verify the write
// behaviour end-to-end (the pure diff logic is covered in lib/job-worker-diff).

jest.mock('@/lib/supabase-server')
jest.mock('next/cache', () => ({ revalidatePath: jest.fn() }))
jest.mock('next/navigation', () => ({ redirect: jest.fn(), notFound: jest.fn() }))
jest.mock('@/lib/notify-contractor', () => ({ notifyContractorAssigned: jest.fn().mockResolvedValue(undefined) }))
jest.mock('@/lib/amendment-lock', () => ({
  assertCanAmend: jest.fn().mockReturnValue({ overridden: false }),
  writeAmendmentAudit: jest.fn().mockResolvedValue(undefined),
}))
jest.mock('@/lib/job-versions', () => ({
  computeChangedJobFields: jest.fn().mockReturnValue([]),
  snapshotJobVersion: jest.fn().mockResolvedValue(undefined),
}))

import { updateJob } from '@/app/portal/jobs/_actions'
import { createClient } from '@/lib/supabase-server'

const mockedCreate = createClient as unknown as jest.Mock

const CURRENT = {
  id: 'j-1', contractor_id: 'A', client_id: 'cl-1', job_number: 'J-1', invoice_id: null,
  scheduled_date: null, scheduled_time: null, allowed_hours: 4,
  job_price: null, description: 'desc', address: 'addr',
}

interface Opts {
  existing: Array<Record<string, unknown>>
  ci?: Record<string, unknown> | null
}

function makeClient({ existing, ci = null }: Opts) {
  const jwInsert = jest.fn().mockResolvedValue({ error: null })
  const jwDelete = jest.fn().mockReturnValue({ eq: jest.fn().mockReturnValue({ eq: jest.fn().mockResolvedValue({ error: null }) }) })
  const jobsUpdate = jest.fn().mockReturnValue({ eq: jest.fn().mockResolvedValue({ error: null }) })

  const from = jest.fn().mockImplementation((table: string) => {
    if (table === 'jobs') {
      return { select: jest.fn().mockReturnThis(), eq: jest.fn().mockReturnThis(), single: jest.fn().mockResolvedValue({ data: CURRENT, error: null }), update: jobsUpdate }
    }
    if (table === 'job_workers') {
      return {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({ data: existing, error: null }), // diff read terminal
        delete: jwDelete,
        insert: jwInsert,
      }
    }
    if (table === 'contractor_invoices') {
      return { select: jest.fn().mockReturnThis(), eq: jest.fn().mockReturnThis(), neq: jest.fn().mockReturnThis(), limit: jest.fn().mockReturnThis(), maybeSingle: jest.fn().mockResolvedValue({ data: ci, error: null }) }
    }
    if (table === 'pay_run_items') {
      return { select: jest.fn().mockReturnThis(), eq: jest.fn().mockReturnThis(), maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }) }
    }
    if (table === 'contractors') {
      return {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: { full_name: 'Worker', insurance_expiry: '2099-01-01' }, error: null }), // insurance re-check on primary change
        in: jest.fn().mockResolvedValue({ data: [{ id: 'B', hourly_rate: 40 }, { id: 'C', hourly_rate: 55 }], error: null }), // rate lookup for new workers
      }
    }
    if (table === 'audit_log') return { insert: jest.fn().mockResolvedValue({ error: null }) }
    return { select: jest.fn().mockReturnThis(), eq: jest.fn().mockReturnThis(), single: jest.fn().mockResolvedValue({ data: null, error: null }), maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }), insert: jest.fn().mockResolvedValue({ error: null }) }
  })

  return { client: { from, auth: { getUser: jest.fn().mockResolvedValue({ data: { user: { id: 'u-1', email: 'admin@sano.nz' } } }) } }, spies: { jwInsert, jwDelete, jobsUpdate } }
}

const baseInput = { id: 'j-1', client_id: 'cl-1', contractor_id: 'A', description: 'desc', address: 'addr', allowed_hours: 4 }

describe('updateJob — non-destructive worker diff', () => {
  beforeEach(() => mockedCreate.mockReset())

  it('editing job details only (no worker_ids) never touches job_workers', async () => {
    const { client, spies } = makeClient({ existing: [{ contractor_id: 'A' }] })
    mockedCreate.mockReturnValue(client)
    await updateJob({ ...baseInput, description: 'new description' }) // worker_ids undefined
    expect(spies.jwDelete).not.toHaveBeenCalled()
    expect(spies.jwInsert).not.toHaveBeenCalled()
  })

  it('retain A + add B → inserts only B, deletes nothing', async () => {
    const { client, spies } = makeClient({ existing: [{ contractor_id: 'A', pay_status: 'pending' }] })
    mockedCreate.mockReturnValue(client)
    await updateJob({ ...baseInput, worker_ids: ['A', 'B'] })
    expect(spies.jwDelete).not.toHaveBeenCalled()
    expect(spies.jwInsert).toHaveBeenCalledTimes(1)
    const rows = spies.jwInsert.mock.calls[0][0]
    expect(rows).toEqual([expect.objectContaining({ contractor_id: 'B', pay_rate: 40, pay_type: 'hourly' })])
  })

  it('retain A + remove unpaid B → deletes B, inserts nothing', async () => {
    const { client, spies } = makeClient({ existing: [{ contractor_id: 'A', pay_status: 'pending' }, { contractor_id: 'B', pay_status: 'pending' }] })
    mockedCreate.mockReturnValue(client)
    await updateJob({ ...baseInput, worker_ids: ['A'] })
    expect(spies.jwDelete).toHaveBeenCalledTimes(1)
    expect(spies.jwInsert).not.toHaveBeenCalled()
  })

  it('blocks removing a worker with an active payable — no writes', async () => {
    const { client, spies } = makeClient({ existing: [{ contractor_id: 'A' }, { contractor_id: 'B', pay_status: 'pending', contractors: { full_name: 'Bee' } }], ci: { invoice_number: 'CI-0007' } })
    mockedCreate.mockReturnValue(client)
    const res = await updateJob({ ...baseInput, worker_ids: ['A'] })
    expect(res).toMatchObject({ error: expect.stringContaining('CI-0007') })
    expect(spies.jwDelete).not.toHaveBeenCalled()
    expect(spies.jwInsert).not.toHaveBeenCalled()
  })

  it('blocks removing a worker with approved extra hours — no writes', async () => {
    const { client, spies } = makeClient({ existing: [{ contractor_id: 'A' }, { contractor_id: 'B', extra_hours_status: 'approved', extra_hours: 1, contractors: { full_name: 'Bee' } }] })
    mockedCreate.mockReturnValue(client)
    const res = await updateJob({ ...baseInput, worker_ids: ['A'] })
    expect(res).toMatchObject({ error: expect.stringContaining('extra hours') })
    expect(spies.jwDelete).not.toHaveBeenCalled()
    expect(spies.jwInsert).not.toHaveBeenCalled()
  })

  it('identical worker set is idempotent — no writes', async () => {
    const { client, spies } = makeClient({ existing: [{ contractor_id: 'A', pay_status: 'pending' }] })
    mockedCreate.mockReturnValue(client)
    await updateJob({ ...baseInput, worker_ids: ['A'] })
    expect(spies.jwDelete).not.toHaveBeenCalled()
    expect(spies.jwInsert).not.toHaveBeenCalled()
  })
})

describe('updateJob — primary-pointer invariant (jobs.contractor_id ↔ job_workers)', () => {
  beforeEach(() => mockedCreate.mockReset())

  it('1. multi-contractor job keeps all worker rows on an unrelated edit', async () => {
    const { client, spies } = makeClient({ existing: [{ contractor_id: 'A' }, { contractor_id: 'B' }] })
    mockedCreate.mockReturnValue(client)
    await updateJob({ ...baseInput, worker_ids: ['A', 'B'], description: 'new desc' }) // primary A unchanged
    expect(spies.jwDelete).not.toHaveBeenCalled()
    expect(spies.jwInsert).not.toHaveBeenCalled()
  })

  it('2. changing the primary to another existing worker updates only the pointer', async () => {
    const { client, spies } = makeClient({ existing: [{ contractor_id: 'A' }, { contractor_id: 'B' }] })
    mockedCreate.mockReturnValue(client)
    await updateJob({ ...baseInput, worker_ids: ['A', 'B'], contractor_id: 'B' })
    expect(spies.jwDelete).not.toHaveBeenCalled()
    expect(spies.jwInsert).not.toHaveBeenCalled()
    expect(spies.jobsUpdate).toHaveBeenCalledWith(expect.objectContaining({ contractor_id: 'B' }))
  })

  it('3. rejects a primary outside the worker set — no writes', async () => {
    const { client, spies } = makeClient({ existing: [{ contractor_id: 'A' }] })
    mockedCreate.mockReturnValue(client)
    const res = await updateJob({ ...baseInput, worker_ids: ['A'], contractor_id: 'Z' })
    expect(res).toMatchObject({ error: expect.stringContaining("isn’t assigned to this job") })
    expect(spies.jobsUpdate).not.toHaveBeenCalled()
    expect(spies.jwInsert).not.toHaveBeenCalled()
  })

  it('4a. worker_ids undefined + primary set to an existing worker → pointer only, no worker rows created', async () => {
    const { client, spies } = makeClient({ existing: [{ contractor_id: 'A' }, { contractor_id: 'B' }] })
    mockedCreate.mockReturnValue(client)
    await updateJob({ ...baseInput, contractor_id: 'B' }) // no worker_ids
    expect(spies.jwInsert).not.toHaveBeenCalled()
    expect(spies.jwDelete).not.toHaveBeenCalled()
    expect(spies.jobsUpdate).toHaveBeenCalledWith(expect.objectContaining({ contractor_id: 'B' }))
  })

  it('4b. worker_ids undefined + primary set to a NON-worker → rejected, no writes', async () => {
    const { client, spies } = makeClient({ existing: [{ contractor_id: 'A' }] })
    mockedCreate.mockReturnValue(client)
    const res = await updateJob({ ...baseInput, contractor_id: 'Z' }) // no worker_ids
    expect(res).toMatchObject({ error: expect.stringContaining("isn’t assigned to this job") })
    expect(spies.jobsUpdate).not.toHaveBeenCalled()
    expect(spies.jwInsert).not.toHaveBeenCalled()
  })

  it('5. changing allocated hours leaves the kept worker (and its rate) untouched', async () => {
    const { client, spies } = makeClient({ existing: [{ contractor_id: 'A', pay_status: 'pending' }] })
    mockedCreate.mockReturnValue(client)
    await updateJob({ ...baseInput, worker_ids: ['A'], allowed_hours: 9 }) // hours change only
    expect(spies.jwDelete).not.toHaveBeenCalled()
    expect(spies.jwInsert).not.toHaveBeenCalled() // A is toKeep — never re-written, so its rate snapshot is preserved
  })
})
