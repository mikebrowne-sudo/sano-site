/** @jest-environment node */
// The contractor "Did this job go to plan?" save. It used to pass a null
// scheduled date into isConfirmable, which rejects a dateless job — so every
// confirmation from every contractor failed with "This job isn't finished yet".

const updates: Array<Record<string, unknown>> = []
let jobRow: { status: string; scheduled_date: string | null; completed_at: string | null } = {
  status: 'completed', scheduled_date: '2026-10-14', completed_at: '2026-10-14T03:40:00Z',
}

const userClient = {
  auth: { getUser: async () => ({ data: { user: { id: 'u-upasni' } } }) },
  from: (table: string) => {
    const q: Record<string, unknown> = {}
    q.select = () => q
    q.eq = () => q
    q.maybeSingle = async () =>
      table === 'contractors'
        ? { data: { id: 'c-upasni' } }
        : { data: { id: 'jw-1', hours_confirmed_status: 'unconfirmed', jobs: jobRow } }
    return q
  },
}
const svc = {
  from: (table: string) => ({
    update: (payload: Record<string, unknown>) => {
      updates.push(payload)
      const chain = { eq: () => chain, select: async () => ({ data: [{ id: 'jw-1' }], error: null }) }
      return chain
    },
    insert: async () => ({ error: null, table }),
  }),
}

jest.mock('@/lib/supabase-server', () => ({ createClient: () => userClient }))
jest.mock('@/lib/supabase-service', () => ({ getServiceSupabase: () => svc }))
jest.mock('next/cache', () => ({ revalidatePath: jest.fn() }))

import { confirmJobHours } from '@/app/contractor/jobs/[id]/_actions-confirm-hours'

beforeEach(() => { updates.length = 0 })

describe('confirmJobHours', () => {
  it('saves "Yes, as planned" on a finished job', async () => {
    const res = await confirmJobHours({ jobId: 'job-0341', answer: 'as_planned' })
    expect(res).toEqual({ ok: true })
    expect(updates[0]).toMatchObject({ hours_confirmed_status: 'as_planned' })
  })

  it('saves extra hours as pending for review', async () => {
    const res = await confirmJobHours({ jobId: 'job-0495', answer: 'took_longer', extraHours: 1.5, note: 'oven needed a second pass' })
    expect(res).toEqual({ ok: true })
    expect(updates[0]).toMatchObject({ hours_confirmed_status: 'took_longer', extra_hours: 1.5, extra_hours_status: 'pending' })
  })

  it('still refuses a job that is not finished', async () => {
    jobRow = { status: 'assigned', scheduled_date: '2026-10-16', completed_at: null }
    const res = await confirmJobHours({ jobId: 'job-0399', answer: 'as_planned' })
    expect(res).toEqual({ error: expect.stringMatching(/isn.t finished/) })
    expect(updates).toHaveLength(0)
  })
})
