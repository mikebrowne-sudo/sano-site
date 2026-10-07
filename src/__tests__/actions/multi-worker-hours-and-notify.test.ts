/** @jest-environment node */

// Two cleaners on one job (2026-09).
//
// Three bugs, all fixed here:
//   1. only the PRIMARY contractor was notified — the second cleaner was
//      never told about a job they were assigned to;
//   2. adding a worker on edit notified nobody, because the notify step
//      fired only when the primary POINTER changed;
//   3. every worker was allocated the job's FULL allowed_hours, so a
//      2-cleaner 8h job booked 16h of pay against an 8h job.
//
// allowed_hours is the job's TOTAL labour: 8h across 2 cleaners is 4h each.

jest.mock('@/lib/supabase-server')
jest.mock('next/cache', () => ({ revalidatePath: jest.fn() }))
jest.mock('next/navigation', () => ({ redirect: jest.fn(), notFound: jest.fn() }))
jest.mock('@/lib/is-admin', () => ({ isAdminUser: () => true, isAdminEmail: () => true }))
jest.mock('@/lib/notify-contractor', () => ({
  notifyContractorAssigned: jest.fn().mockResolvedValue(undefined),
}))

import { createJob } from '@/app/portal/jobs/_actions'
import { notifyContractorAssigned } from '@/lib/notify-contractor'
import { createClient } from '@/lib/supabase-server'

const mockedCreate = createClient as unknown as jest.Mock
const mockedNotify = notifyContractorAssigned as unknown as jest.Mock

function makeClient() {
  const jwUpsert = jest.fn().mockResolvedValue({ error: null })
  const from = jest.fn().mockImplementation((table: string) => {
    if (table === 'jobs') {
      return {
        insert: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: { id: 'j-1', job_number: 'JOB-0001' }, error: null,
            }),
          }),
        }),
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: { id: 'j-1', job_number: 'JOB-0001' }, error: null }),
      }
    }
    if (table === 'job_workers') {
      return { upsert: jwUpsert, select: jest.fn().mockReturnThis(), eq: jest.fn().mockResolvedValue({ data: [], error: null }) }
    }
    if (table === 'contractors') {
      return {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        // insurance_expiry is required — createJob refuses to assign a
        // contractor with missing/expired insurance.
        single: jest.fn().mockResolvedValue({ data: { id: 'A', full_name: 'Alice', email: 'a@x.nz', insurance_expiry: '2099-01-01' }, error: null }),
        in: jest.fn().mockResolvedValue({
          data: [
            { id: 'A', full_name: 'Alice', email: 'a@x.nz', hourly_rate: 35 },
            { id: 'B', full_name: 'Bob', email: 'b@x.nz', hourly_rate: 35 },
            { id: 'C', full_name: 'Cara', email: 'c@x.nz', hourly_rate: 35 },
          ],
          error: null,
        }),
      }
    }
    return {
      select: jest.fn().mockReturnThis(), eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: null, error: null }),
      maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
      insert: jest.fn().mockResolvedValue({ error: null }),
    }
  })
  return {
    client: { from, auth: { getUser: jest.fn().mockResolvedValue({ data: { user: { id: 'u-1', email: 'admin@sano.nz' } } }) } },
    spies: { jwUpsert },
  }
}

const baseInput = {
  client_id: 'cl-1',
  address: '1 Test St',
  description: 'Clean',
  scheduled_date: '2026-09-11',
  allowed_hours: 8,
}

describe('createJob — two cleaners on one job', () => {
  beforeEach(() => { mockedCreate.mockReset(); mockedNotify.mockClear() })

  it('splits the allowed hours instead of giving each worker the full job', async () => {
    const { client, spies } = makeClient()
    mockedCreate.mockReturnValue(client)

    await createJob({ ...baseInput, contractor_id: 'A', worker_ids: ['A', 'B'] })

    const rows = spies.jwUpsert.mock.calls[0][0] as Array<{ contractor_id: string; hours_allocated: number }>
    expect(rows).toHaveLength(2)
    expect(rows.map((r) => r.hours_allocated)).toEqual([4, 4])
    // The invariant that stops the overpayment.
    expect(rows.reduce((s, r) => s + r.hours_allocated, 0)).toBe(8)
  })

  it('notifies EVERY assigned worker, not just the primary', async () => {
    const { client } = makeClient()
    mockedCreate.mockReturnValue(client)

    await createJob({ ...baseInput, contractor_id: 'A', worker_ids: ['A', 'B'] })

    expect(mockedNotify).toHaveBeenCalledTimes(2)
    const notified = mockedNotify.mock.calls.map((c) => (c[0] as { full_name: string }).full_name).sort()
    expect(notified).toEqual(['Alice', 'Bob'])
  })

  it("tells each worker THEIR hours, not the job's total", async () => {
    const { client } = makeClient()
    mockedCreate.mockReturnValue(client)

    await createJob({ ...baseInput, contractor_id: 'A', worker_ids: ['A', 'B'] })

    for (const call of mockedNotify.mock.calls) {
      expect((call[1] as { allowed_hours: number }).allowed_hours).toBe(4)
    }
  })

  it('gives a solo worker the whole job', async () => {
    const { client, spies } = makeClient()
    mockedCreate.mockReturnValue(client)

    await createJob({ ...baseInput, contractor_id: 'A', worker_ids: ['A'] })

    const rows = spies.jwUpsert.mock.calls[0][0] as Array<{ hours_allocated: number }>
    expect(rows[0].hours_allocated).toBe(8)
    expect(mockedNotify).toHaveBeenCalledTimes(1)
  })

  it('still notifies the primary when no worker_ids are supplied', async () => {
    const { client } = makeClient()
    mockedCreate.mockReturnValue(client)

    await createJob({ ...baseInput, contractor_id: 'A' })

    expect(mockedNotify).toHaveBeenCalledTimes(1)
  })

  it('splits three ways on quarter-hours without overpaying', async () => {
    const { client, spies } = makeClient()
    mockedCreate.mockReturnValue(client)

    await createJob({ ...baseInput, allowed_hours: 5, contractor_id: 'A', worker_ids: ['A', 'B', 'C'] })

    const rows = spies.jwUpsert.mock.calls[0][0] as Array<{ hours_allocated: number }>
    expect(rows.map((r) => r.hours_allocated)).toEqual([1.75, 1.75, 1.5])
    expect(rows.reduce((s, r) => s + r.hours_allocated, 0)).toBe(5)
  })
})
