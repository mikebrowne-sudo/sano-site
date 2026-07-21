/** @jest-environment node */

// Stage 0 PR D — job-identity protection. Once a job has contractor financial
// history, its property (address) and customer (client_id) can't be changed
// server-side. This is what would have prevented JOB-0065/JOB-0066 being
// repurposed after payment.

jest.mock('@/lib/supabase-server')
jest.mock('next/cache', () => ({ revalidatePath: jest.fn() }))
jest.mock('next/navigation', () => ({ redirect: jest.fn(), notFound: jest.fn() }))
jest.mock('@/lib/notify-contractor', () => ({ notifyContractorAssigned: jest.fn().mockResolvedValue(undefined) }))
jest.mock('@/lib/amendment-lock', () => ({ assertCanAmend: jest.fn().mockReturnValue({ overridden: false }), writeAmendmentAudit: jest.fn().mockResolvedValue(undefined) }))
jest.mock('@/lib/job-versions', () => ({ computeChangedJobFields: jest.fn().mockReturnValue([]), snapshotJobVersion: jest.fn().mockResolvedValue(undefined) }))
jest.mock('@/lib/is-admin', () => ({ isAdminUser: (u: { email?: string } | null) => u?.email === 'admin@sano.nz' }))

import { updateJob } from '@/app/portal/jobs/_actions'
import { createClient } from '@/lib/supabase-server'

const mockedCreate = createClient as unknown as jest.Mock

const CURRENT = { id: 'j-1', contractor_id: 'A', client_id: 'cl-1', job_number: 'J-1', invoice_id: null, scheduled_date: null, scheduled_time: null, allowed_hours: 4, job_price: null, description: 'desc', address: '14/18 Arthur Street' }

function makeClient({ hasPay, email = 'admin@sano.nz' }: { hasPay: boolean; email?: string }) {
  const jobsUpdate = jest.fn().mockReturnValue({ eq: jest.fn().mockResolvedValue({ error: null }) })
  const auditInsert = jest.fn().mockResolvedValue({ error: null })
  const from = jest.fn((table: string) => {
    if (table === 'jobs') return { select: jest.fn().mockReturnThis(), eq: jest.fn().mockReturnThis(), single: jest.fn().mockResolvedValue({ data: CURRENT, error: null }), update: jobsUpdate }
    if (table === 'job_workers') return { select: jest.fn().mockReturnThis(), eq: jest.fn().mockResolvedValue({ data: [{ contractor_id: 'A' }], error: null }) }
    if (table === 'contractor_invoices') return { select: jest.fn().mockReturnThis(), eq: jest.fn().mockReturnThis(), neq: jest.fn().mockResolvedValue({ data: hasPay ? [{ invoice_number: 'CI-0020' }, { invoice_number: 'CI-0041' }] : [], error: null }) }
    if (table === 'contractors') return { select: jest.fn().mockReturnThis(), in: jest.fn().mockResolvedValue({ data: [], error: null }) }
    if (table === 'audit_log') return { insert: auditInsert }
    return { select: jest.fn().mockReturnThis(), eq: jest.fn().mockReturnThis(), single: jest.fn().mockResolvedValue({ data: null }), maybeSingle: jest.fn().mockResolvedValue({ data: null }), insert: jest.fn().mockResolvedValue({ error: null }) }
  })
  return { client: { from, auth: { getUser: jest.fn().mockResolvedValue({ data: { user: { id: 'u-1', email } } }) } }, spies: { jobsUpdate, auditInsert } }
}

const base = { id: 'j-1', client_id: 'cl-1', address: '14/18 Arthur Street', description: 'desc' }

beforeEach(() => mockedCreate.mockReset())

it('blocks an ADDRESS change on a job with contractor payments — no write', async () => {
  const { client, spies } = makeClient({ hasPay: true })
  mockedCreate.mockReturnValue(client)
  const res = await updateJob({ ...base, address: '78 Luckens Rd, West Harbour' })
  expect(res).toMatchObject({ error: expect.stringContaining('property or customer') })
  expect(spies.jobsUpdate).not.toHaveBeenCalled()
})

it('blocks a CLIENT change on a job with contractor payments — no write', async () => {
  const { client, spies } = makeClient({ hasPay: true })
  mockedCreate.mockReturnValue(client)
  const res = await updateJob({ ...base, client_id: 'cl-2' })
  expect(res).toMatchObject({ error: expect.stringContaining('property or customer') })
  expect(spies.jobsUpdate).not.toHaveBeenCalled()
})

it('ALLOWS an address change when the job has NO contractor payments', async () => {
  const { client, spies } = makeClient({ hasPay: false })
  mockedCreate.mockReturnValue(client)
  await updateJob({ ...base, address: '78 Luckens Rd, West Harbour' })
  expect(spies.jobsUpdate).toHaveBeenCalled()
})

it('ALLOWS a non-identity edit (description) even with contractor payments', async () => {
  const { client, spies } = makeClient({ hasPay: true })
  mockedCreate.mockReturnValue(client)
  await updateJob({ ...base, description: 'corrected description' }) // address/client unchanged
  expect(spies.jobsUpdate).toHaveBeenCalled()
})

it('allows an ADMIN force override WITH a reason, and audits reason + affected invoices + person', async () => {
  const { client, spies } = makeClient({ hasPay: true, email: 'admin@sano.nz' })
  mockedCreate.mockReturnValue(client)
  await updateJob({ ...base, address: '78 Luckens Rd, West Harbour', force: true, identity_override_reason: 'genuine correction — same job, address fixed' })
  expect(spies.jobsUpdate).toHaveBeenCalled()
  const override = spies.auditInsert.mock.calls.find((c) => c[0]?.action === 'job.identity_changed_override')
  expect(override).toBeDefined()
  expect(override![0].actor_id).toBe('u-1') // person performing the override
  expect(override![0].before).toMatchObject({ address: '14/18 Arthur Street', client_id: 'cl-1' })
  expect(override![0].after).toMatchObject({
    reason: 'genuine correction — same job, address fixed',
    affected_invoice_numbers: ['CI-0020', 'CI-0041'],
    forced_by_admin: true,
  })
})

it('blocks an ADMIN force WITHOUT a reason', async () => {
  const { client, spies } = makeClient({ hasPay: true, email: 'admin@sano.nz' })
  mockedCreate.mockReturnValue(client)
  const res = await updateJob({ ...base, address: '78 Luckens Rd, West Harbour', force: true }) // no reason
  expect(res).toMatchObject({ error: expect.stringContaining('property or customer') })
  expect(spies.jobsUpdate).not.toHaveBeenCalled()
})

it('does NOT let a non-admin bypass with force + reason', async () => {
  const { client, spies } = makeClient({ hasPay: true, email: 'staff@sano.nz' })
  mockedCreate.mockReturnValue(client)
  const res = await updateJob({ ...base, address: '78 Luckens Rd, West Harbour', force: true, identity_override_reason: 'nope' })
  expect(res).toMatchObject({ error: expect.stringContaining('property or customer') })
  expect(spies.jobsUpdate).not.toHaveBeenCalled()
})

it('the block message names the affected contractor invoices (a clear warning)', async () => {
  const { client } = makeClient({ hasPay: true })
  mockedCreate.mockReturnValue(client)
  const res = await updateJob({ ...base, address: '78 Luckens Rd, West Harbour' })
  expect(res.error).toContain('CI-0020')
})
