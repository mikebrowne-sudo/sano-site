/** @jest-environment node */

// Stage 0 PR C — a job_workers seed failure must NOT leave a payable recurring
// occurrence (job with contractor_id but no worker row). generateNextJob rolls
// the just-created job back.

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

it('rolls the occurrence back when the job_workers seed fails', async () => {
  const jobsInsert = jest.fn().mockReturnValue({ select: jest.fn().mockReturnValue({ single: jest.fn().mockResolvedValue({ data: { id: 'newjob-1', job_number: 'JOB-1' }, error: null }) }) })
  const jobsDelete = jest.fn().mockReturnValue({ eq: jest.fn().mockResolvedValue({ error: null }) })
  const jwInsert = jest.fn().mockResolvedValue({ error: { message: 'boom' } }) // worker seed FAILS

  const from = jest.fn((table: string) => {
    if (table === 'recurring_jobs') return { select: jest.fn().mockReturnThis(), eq: jest.fn().mockReturnThis(), single: jest.fn().mockResolvedValue({ data: REC, error: null }), update: jest.fn().mockReturnValue({ eq: jest.fn().mockResolvedValue({ error: null }) }) }
    if (table === 'jobs') return { select: jest.fn().mockReturnThis(), eq: jest.fn().mockReturnThis(), maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }), insert: jobsInsert, delete: jobsDelete }
    if (table === 'contractors') return { select: jest.fn().mockReturnThis(), eq: jest.fn().mockReturnThis(), single: jest.fn().mockResolvedValue({ data: { hourly_rate: 40 }, error: null }) }
    if (table === 'job_workers') return { insert: jwInsert }
    return { select: jest.fn().mockReturnThis(), eq: jest.fn().mockReturnThis(), single: jest.fn().mockResolvedValue({ data: null }), maybeSingle: jest.fn().mockResolvedValue({ data: null }), insert: jest.fn().mockResolvedValue({ error: null }) }
  })
  mockedCreate.mockReturnValue({ from, auth: { getUser: jest.fn().mockResolvedValue({ data: { user: { id: 'u-1', email: 'admin@sano.nz' } } }) } })

  const res = await generateNextJob('r-1')

  // job was created then rolled back; the caller gets a clear error, no orphan job
  expect(jobsDelete).toHaveBeenCalledTimes(1)
  expect(res).toMatchObject({ error: expect.stringContaining('was not generated') })
})
