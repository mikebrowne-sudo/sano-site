/** @jest-environment node */

// Stage 0 PR C — a job_workers seed failure must NEVER leave a payable recurring
// occurrence (job with contractor_id but no worker row). generateNextJob rolls
// the occurrence back, and escalates when the rollback delete ALSO fails.

jest.mock('@/lib/supabase-server')
jest.mock('next/cache', () => ({ revalidatePath: jest.fn() }))
jest.mock('next/navigation', () => ({ redirect: jest.fn() }))
jest.mock('@/lib/notify-contractor', () => ({ notifyContractorAssigned: jest.fn().mockResolvedValue(undefined) }))
jest.mock('@/lib/recurring-invoice', () => ({ computeNextInvoiceDate: jest.fn() }))

import { generateNextJob } from '@/app/portal/recurring-jobs/_actions'
import { createClient } from '@/lib/supabase-server'

const mockedCreate = createClient as unknown as jest.Mock

const REC = {
  id: 'r-1', client_id: 'cl-1', title: 'Weekly office clean', description: null, address: 'addr',
  scheduled_time: null, duration_estimate: '2', contractor_id: 'c-1', contractor_pay_type: 'hourly',
  assigned_to: null, contractor_price: null, frequency: 'weekly', start_date: '2026-01-01',
  next_due_date: '2026-08-01', end_date: null, status: 'active',
}

function makeClient(opts: { deleteErr?: { message: string } | null; updateErr?: { message: string } | null }) {
  const jobsDelete = jest.fn().mockReturnValue({ eq: jest.fn().mockResolvedValue({ error: opts.deleteErr ?? null }) })
  const jobsUpdate = jest.fn().mockReturnValue({ eq: jest.fn().mockResolvedValue({ error: opts.updateErr ?? null }) })
  const auditInsert = jest.fn().mockResolvedValue({ error: null })
  const jwInsert = jest.fn().mockResolvedValue({ error: { message: 'boom' } }) // worker seed always FAILS here

  const from = jest.fn((table: string) => {
    if (table === 'recurring_jobs') return { select: jest.fn().mockReturnThis(), eq: jest.fn().mockReturnThis(), single: jest.fn().mockResolvedValue({ data: REC, error: null }), update: jest.fn().mockReturnValue({ eq: jest.fn().mockResolvedValue({ error: null }) }) }
    if (table === 'jobs') return {
      select: jest.fn().mockReturnThis(), eq: jest.fn().mockReturnThis(), maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
      insert: jest.fn().mockReturnValue({ select: jest.fn().mockReturnValue({ single: jest.fn().mockResolvedValue({ data: { id: 'newjob-1', job_number: 'JOB-1' }, error: null }) }) }),
      delete: jobsDelete,
      update: jobsUpdate,
    }
    if (table === 'contractors') return { select: jest.fn().mockReturnThis(), eq: jest.fn().mockReturnThis(), single: jest.fn().mockResolvedValue({ data: { hourly_rate: 40 }, error: null }) }
    if (table === 'job_workers') return { insert: jwInsert }
    if (table === 'audit_log') return { insert: auditInsert }
    return { select: jest.fn().mockReturnThis(), eq: jest.fn().mockReturnThis(), single: jest.fn().mockResolvedValue({ data: null }), maybeSingle: jest.fn().mockResolvedValue({ data: null }), insert: jest.fn().mockResolvedValue({ error: null }) }
  })
  return { client: { from, auth: { getUser: jest.fn().mockResolvedValue({ data: { user: { id: 'u-1', email: 'admin@sano.nz' } } }) } }, spies: { jobsDelete, jobsUpdate, auditInsert } }
}

beforeEach(() => mockedCreate.mockReset())

it('worker seed fails, delete succeeds → occurrence rolled back, error (not success)', async () => {
  const { client, spies } = makeClient({ deleteErr: null })
  mockedCreate.mockReturnValue(client)
  const res = await generateNextJob('r-1')
  expect(spies.jobsDelete).toHaveBeenCalledTimes(1)
  expect(spies.jobsUpdate).not.toHaveBeenCalled()
  expect(res).toMatchObject({ error: expect.stringContaining('was not generated') })
  expect(res).not.toHaveProperty('success')
})

it('worker seed fails AND delete fails → neutralised, high-visibility audit, NOT success', async () => {
  const { client, spies } = makeClient({ deleteErr: { message: 'delete blocked' }, updateErr: null })
  mockedCreate.mockReturnValue(client)
  const res = await generateNextJob('r-1')
  // delete failed → neutralise attempted (contractor_id cleared, status→draft)
  expect(spies.jobsUpdate).toHaveBeenCalledWith(expect.objectContaining({ contractor_id: null, status: 'draft' }))
  // a high-visibility orphan_alert audit carrying job + contractor id was written
  const orphanAudit = spies.auditInsert.mock.calls.find((c) => c[0]?.action === 'recurring_job.orphan_alert')
  expect(orphanAudit).toBeDefined()
  expect(orphanAudit![0].after).toMatchObject({ severity: 'high', job_id: 'newjob-1', contractor_id: 'c-1' })
  // never a normal success
  expect(res).toMatchObject({ error: expect.stringContaining('neutralised') })
  expect(res).not.toHaveProperty('success')
})

it('worker seed fails AND delete AND neutralise fail → CRITICAL error, still not success', async () => {
  const { client } = makeClient({ deleteErr: { message: 'delete blocked' }, updateErr: { message: 'update blocked' } })
  mockedCreate.mockReturnValue(client)
  const res = await generateNextJob('r-1')
  expect(res).toMatchObject({ error: expect.stringContaining('CRITICAL') })
  expect(res).not.toHaveProperty('success')
})
