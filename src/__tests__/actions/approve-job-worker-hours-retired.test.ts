/** @jest-environment node */

// Stage F — the old job-worker "Approve hours" action is retired. It must
// not be able to create or approve any contractor pay state (which used to
// feed the parallel pay_runs / pay_run_items track). It should return a
// message pointing at the canonical flow and touch no database at all.

jest.mock('@/lib/supabase-server')

import { approveJobWorkerHours } from '@/app/portal/jobs/[id]/_actions-approve-hours'
import { createClient } from '@/lib/supabase-server'

const mockedCreate = createClient as unknown as jest.Mock

beforeEach(() => mockedCreate.mockReset())

describe('approveJobWorkerHours (retired)', () => {
  it('returns a retirement message and writes nothing', async () => {
    const res = await approveJobWorkerHours({ jobId: 'j1', contractorId: 'c1' })
    expect('error' in res && res.error).toMatch(/retired|pending approvals/i)
    // No Supabase client is even created — so no row can be written / approved.
    expect(mockedCreate).not.toHaveBeenCalled()
  })

  it('points users at the new contractor pay flow', async () => {
    const res = await approveJobWorkerHours({ jobId: 'j1', contractorId: 'c1' })
    expect('error' in res && res.error).toMatch(/Pending approvals|Pay approvals/i)
  })
})
