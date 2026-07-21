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
  id: 'j-1', contractor_id: 'A', job_number: 'J-1', invoice_id: null,
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
      return { select: jest.fn().mockReturnThis(), eq: jest.fn().mockReturnThis(), neq: jest.fn().mockReturnThis(), maybeSingle: jest.fn().mockResolvedValue({ data: ci, error: null }) }
    }
    if (table === 'pay_run_items') {
      return { select: jest.fn().mockReturnThis(), eq: jest.fn().mockReturnThis(), maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }) }
    }
    if (table === 'contractors') {
      return { select: jest.fn().mockReturnThis(), in: jest.fn().mockResolvedValue({ data: [{ id: 'B', hourly_rate: 40 }, { id: 'C', hourly_rate: 55 }], error: null }) }
    }
    if (table === 'audit_log') return { insert: jest.fn().mockResolvedValue({ error: null }) }
    return { select: jest.fn().mockReturnThis(), eq: jest.fn().mockReturnThis(), single: jest.fn().mockResolvedValue({ data: null, error: null }), maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }), insert: jest.fn().mockResolvedValue({ error: null }) }
  })

  return { client: { from, auth: { getUser: jest.fn().mockResolvedValue({ data: { user: { id: 'u-1', email: 'admin@sano.nz' } } }) } }, spies: { jwInsert, jwDelete } }
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
