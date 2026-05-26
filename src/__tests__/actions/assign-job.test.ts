/** @jest-environment node */

// Phase G.1 — tests for the pay_rate snapshot on assignment and the
// no-rate hard-block in assignJob.
//
// The action depends on several modules; only the supabase client,
// notification helpers, workforce settings, audit helpers, and
// amendment lock are mocked. The two behaviours under test are:
//
//   1. assigning a contractor whose hourly_rate is null/0 returns a
//      clear error and does NOT write a job_workers row;
//   2. assigning a contractor with a valid hourly_rate snapshots that
//      rate to job_workers.pay_rate, but does NOT overwrite a
//      previously-snapshotted pay_rate.

jest.mock('@/lib/supabase-server')
jest.mock('next/cache', () => ({ revalidatePath: jest.fn() }))
jest.mock('@/lib/notify-contractor', () => ({
  notifyContractorAssigned: jest.fn().mockResolvedValue(undefined),
}))
jest.mock('@/lib/notifications/send', () => ({
  sendNotification: jest.fn().mockResolvedValue(undefined),
}))
jest.mock('@/lib/workforce-settings', () => ({
  loadWorkforceSettings: jest.fn().mockResolvedValue({ block_assignment_until_ready: false }),
}))
jest.mock('@/lib/amendment-lock', () => ({
  assertCanAmend: jest.fn().mockResolvedValue({ ok: true }),
  findLockingInvoiceForQuote: jest.fn(),
  isLockedByInvoice: jest.fn().mockReturnValue(false),
  isAdminUser: jest.fn().mockReturnValue(false),
  writeAmendmentAudit: jest.fn().mockResolvedValue(undefined),
}))

import { assignJob } from '@/app/portal/jobs/[id]/_actions'
import { createClient } from '@/lib/supabase-server'

const mockedCreate = createClient as unknown as jest.Mock

interface FromMockOptions {
  contractor?: Record<string, unknown> | null
  job?: Record<string, unknown> | null
  existingJobWorker?: Record<string, unknown> | null
}

function makeFrom(options: FromMockOptions) {
  const jobWorkersUpsert = jest.fn().mockResolvedValue({ error: null })
  const jobsUpdate = jest.fn().mockReturnValue({ eq: jest.fn().mockResolvedValue({ error: null }) })

  const from = jest.fn().mockImplementation((table: string) => {
    if (table === 'contractors') {
      return {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: options.contractor ?? null, error: null }),
      }
    }
    if (table === 'jobs') {
      return {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: options.job ?? null, error: null }),
        update: jobsUpdate,
      }
    }
    if (table === 'job_workers') {
      return {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        maybeSingle: jest.fn().mockResolvedValue({ data: options.existingJobWorker ?? null, error: null }),
        upsert: jobWorkersUpsert,
      }
    }
    return {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: null, error: null }),
      maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
      insert: jest.fn().mockResolvedValue({ error: null }),
    }
  })

  return {
    client: {
      from,
      auth: { getUser: jest.fn().mockResolvedValue({ data: { user: { id: 'u-1', email: 'admin@sano.nz' } } }) },
    },
    spies: { jobWorkersUpsert, jobsUpdate, from },
  }
}

const validContractor = {
  full_name: 'Test Contractor',
  email: 'c@example.com',
  phone: null,
  hourly_rate: 50,
  insurance_expiry: '2099-01-01',
  status: 'active',
  onboarding_status: 'complete',
  trial_required: false,
  trial_status: null,
  worker_type: 'contractor',
}

const validJob = {
  status: 'draft',
  contractor_id: null,
  job_number: 'J-1',
  title: 'Test',
  address: 'address',
  scheduled_date: null,
  scheduled_time: null,
  duration_estimate: null,
  description: null,
  invoice_id: null,
  allowed_hours: 4,
}

describe('assignJob — no hourly rate hard-block (Phase G.1)', () => {
  beforeEach(() => mockedCreate.mockReset())

  it('returns a clear error and does NOT upsert when hourly_rate is null', async () => {
    const { client, spies } = makeFrom({
      contractor: { ...validContractor, hourly_rate: null },
      job: validJob,
    })
    mockedCreate.mockReturnValue(client)

    const result = await assignJob({ jobId: 'j-1', contractorId: 'c-1' })

    expect(result).toMatchObject({ error: expect.stringContaining('no hourly rate on file') })
    expect(spies.jobWorkersUpsert).not.toHaveBeenCalled()
    expect(spies.jobsUpdate).not.toHaveBeenCalled()
  })

  it('returns a clear error when hourly_rate is zero', async () => {
    const { client, spies } = makeFrom({
      contractor: { ...validContractor, hourly_rate: 0 },
      job: validJob,
    })
    mockedCreate.mockReturnValue(client)

    const result = await assignJob({ jobId: 'j-1', contractorId: 'c-1' })

    expect(result).toMatchObject({ error: expect.stringContaining('no hourly rate on file') })
    expect(spies.jobWorkersUpsert).not.toHaveBeenCalled()
  })
})

describe('assignJob — pay_rate snapshot at assignment (Phase G.1)', () => {
  beforeEach(() => mockedCreate.mockReset())

  it('snapshots contractor.hourly_rate to job_workers.pay_rate on first assignment', async () => {
    const { client, spies } = makeFrom({
      contractor: { ...validContractor, hourly_rate: 50 },
      job: validJob,
      existingJobWorker: null,
    })
    mockedCreate.mockReturnValue(client)

    const result = await assignJob({ jobId: 'j-1', contractorId: 'c-1' })

    expect(result).not.toHaveProperty('error')
    expect(spies.jobWorkersUpsert).toHaveBeenCalledTimes(1)
    const upsertArg = spies.jobWorkersUpsert.mock.calls[0][0]
    expect(upsertArg).toMatchObject({
      job_id: 'j-1',
      contractor_id: 'c-1',
      pay_rate: 50,
      pay_type: 'hourly',
    })
  })

  it('does NOT overwrite an existing pay_rate on reassignment', async () => {
    const { client, spies } = makeFrom({
      contractor: { ...validContractor, hourly_rate: 99 }, // rate has changed
      job: validJob,
      existingJobWorker: { pay_rate: 45 }, // previously snapshotted value
    })
    mockedCreate.mockReturnValue(client)

    const result = await assignJob({ jobId: 'j-1', contractorId: 'c-1' })

    expect(result).not.toHaveProperty('error')
    const upsertArg = spies.jobWorkersUpsert.mock.calls[0][0]
    expect(upsertArg.pay_rate).toBe(45)
  })

  it('replaces a null/0 existing pay_rate with the current contractor rate', async () => {
    const { client, spies } = makeFrom({
      contractor: { ...validContractor, hourly_rate: 50 },
      job: validJob,
      existingJobWorker: { pay_rate: null },
    })
    mockedCreate.mockReturnValue(client)

    await assignJob({ jobId: 'j-1', contractorId: 'c-1' })

    const upsertArg = spies.jobWorkersUpsert.mock.calls[0][0]
    expect(upsertArg.pay_rate).toBe(50)
  })
})
