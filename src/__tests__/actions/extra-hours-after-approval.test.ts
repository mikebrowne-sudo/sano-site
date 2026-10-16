/** @jest-environment node */
// Approved extra hours can be changed or removed from the job page — but never
// while pay is already approved on them (void that payable first). JOB-0495:
// Upasni's 1.5 approved extra hours had to come off with SQL because nothing
// on screen could undo an approval.

let livePayable: { invoice_number: string } | null = null
const updates: Array<Record<string, unknown>> = []

const client = {
  auth: { getUser: async () => ({ data: { user: { id: 'u1', email: 'michael@sano.nz' } } }) },
  from: (table: string) => {
    const q: Record<string, unknown> = {}
    for (const m of ['select', 'eq', 'is', 'neq', 'limit']) q[m] = () => q
    q.single = async () => ({ data: { extra_hours: 1.5, extra_hours_status: 'approved', pay_status: null, hours_allocated: 5, jobs: { allowed_hours: 5 } }, error: null })
    q.maybeSingle = async () => ({ data: table === 'contractor_invoices' ? livePayable : null })
    q.update = (u: Record<string, unknown>) => { updates.push(u); return { eq: () => ({ eq: async () => ({ error: null }) }) } }
    q.insert = async () => ({ error: null })
    return q
  },
}

jest.mock('@/lib/supabase-server', () => ({ createClient: () => client }))
jest.mock('@/lib/require-admin', () => ({ assertAdminAction: jest.fn().mockResolvedValue(undefined) }))
jest.mock('next/cache', () => ({ revalidatePath: jest.fn() }))

import { recordExtraHours } from '@/app/portal/jobs/[id]/_actions-extra-hours'

beforeEach(() => { updates.length = 0; livePayable = null })

describe('changing approved extra hours', () => {
  it('removing them (0) clears the adjustment when no pay is approved', async () => {
    const res = await recordExtraHours('job-0495', 'c-upasni', 0, '')
    expect(res).toEqual({ ok: true })
    expect(updates[0]).toMatchObject({ extra_hours: 0, extra_hours_status: 'none' })
  })

  it('a changed figure goes back to pending for sign-off', async () => {
    const res = await recordExtraHours('job-0495', 'c-upasni', 0.5, 'only half an hour over')
    expect(res).toEqual({ ok: true })
    expect(updates[0]).toMatchObject({ extra_hours: 0.5, extra_hours_status: 'pending' })
  })

  it('is refused while pay is approved on the hours, naming the payable to void', async () => {
    livePayable = { invoice_number: 'CI-0218' }
    const res = await recordExtraHours('job-0495', 'c-upasni', 0, '')
    expect(res).toEqual({ error: expect.stringContaining('CI-0218') })
    expect(updates).toHaveLength(0)
  })
})
