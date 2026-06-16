/** @jest-environment node */

jest.mock('@/lib/supabase-server')
jest.mock('@/lib/is-admin', () => ({ isAdminUser: (u: { email?: string } | null) => !!u && u.email === 'admin@sano.nz' }))
jest.mock('next/cache', () => ({ revalidatePath: jest.fn() }))

import { approveContractorPay } from '@/app/portal/contractor-invoices/_actions-approve-pay'
import { createClient } from '@/lib/supabase-server'

const mockedCreate = createClient as unknown as jest.Mock

interface Cfg {
  email?: string
  job?: Record<string, unknown> | null
  jw?: Record<string, unknown> | null
  dup?: { id: string } | null
  rate?: number | null
  created?: Record<string, unknown> | null
  insertErr?: { message: string } | null
}

function selectChain(value: unknown) {
  const chain: Record<string, unknown> = {}
  chain.select = () => chain
  chain.eq = () => chain
  chain.limit = () => chain
  chain.maybeSingle = jest.fn().mockResolvedValue({ data: value })
  chain.single = jest.fn().mockResolvedValue({ data: value })
  return chain
}

function makeSupabase(cfg: Cfg) {
  const email = cfg.email ?? 'admin@sano.nz'
  const auth = { getUser: async () => ({ data: { user: { id: 'u1', email } } }) }
  const audit = { insert: jest.fn().mockResolvedValue({ error: null }) }

  const ciInsertSingle = jest.fn().mockResolvedValue(
    cfg.insertErr ? { data: null, error: cfg.insertErr } : { data: cfg.created ?? null, error: null },
  )
  const ciInsert = jest.fn().mockReturnValue({ select: jest.fn().mockReturnValue({ single: ciInsertSingle }) })

  const from = jest.fn((table: string) => {
    if (table === 'jobs') return selectChain(cfg.job ?? null)
    if (table === 'job_workers') return selectChain(cfg.jw ?? null)
    if (table === 'contractors') return selectChain(cfg.rate != null ? { hourly_rate: cfg.rate } : null)
    if (table === 'audit_log') return audit
    if (table === 'contractor_invoices') {
      const base = selectChain(cfg.dup ?? null) as Record<string, unknown>
      base.insert = ciInsert
      return base
    }
    return selectChain(null)
  })

  return { client: { auth, from }, ciInsert }
}

const COMPLETED_JOB = {
  id: 'j1', job_number: 'JOB-0048', address: '36 Caroline Heights, Omaha',
  status: 'completed', completed_at: '2026-05-08T03:00:00.000Z', deleted_at: null, description: 'Move-out clean',
}

beforeEach(() => mockedCreate.mockReset())

describe('approveContractorPay', () => {
  it('hourly: creates ONE approved CI with amount = hours × rate, dated to completion', async () => {
    const { client, ciInsert } = makeSupabase({
      job: COMPLETED_JOB,
      jw: { pay_rate: 35, pay_type: 'hourly', hours_allocated: 4, extra_hours: 0, extra_hours_status: 'none' },
      dup: null,
      created: { id: 'ci1', invoice_number: 'CI-0099', amount: 140, status: 'approved' },
    })
    mockedCreate.mockReturnValue(client)

    const res = await approveContractorPay('j1', 'c1', {})

    expect(res).toMatchObject({ ok: true, payable: { id: 'ci1', amount: 140, status: 'approved' } })
    const payload = ciInsert.mock.calls[0][0]
    expect(payload).toMatchObject({
      job_id: 'j1', contractor_id: 'c1', amount: 140, status: 'approved', date_submitted: '2026-05-08',
    })
  })

  it('fixed: creates an approved CI without forcing hours', async () => {
    const { client, ciInsert } = makeSupabase({
      job: COMPLETED_JOB,
      jw: { pay_rate: null, pay_type: 'fixed', hours_allocated: null, extra_hours: null, extra_hours_status: null },
      dup: null,
      created: { id: 'ci2', invoice_number: 'CI-0100', amount: 280, status: 'approved' },
    })
    mockedCreate.mockReturnValue(client)

    const res = await approveContractorPay('j1', 'c1', { fixedAmount: 280 })

    expect(res).toMatchObject({ ok: true, payable: { amount: 280 } })
    expect(ciInsert.mock.calls[0][0]).toMatchObject({ amount: 280, status: 'approved' })
  })

  it('blocks a duplicate (existing payable for job + contractor)', async () => {
    const { client, ciInsert } = makeSupabase({
      job: COMPLETED_JOB,
      jw: { pay_rate: 35, pay_type: 'hourly', hours_allocated: 4, extra_hours: 0, extra_hours_status: 'none' },
      dup: { id: 'ci-existing' },
    })
    mockedCreate.mockReturnValue(client)

    const res = await approveContractorPay('j1', 'c1', {})

    expect(res.error).toMatch(/already approved/i)
    expect(res.alreadyApprovedId).toBe('ci-existing')
    expect(ciInsert).not.toHaveBeenCalled()
  })

  it('errors on missing hourly rate', async () => {
    const { client, ciInsert } = makeSupabase({
      job: COMPLETED_JOB,
      jw: { pay_rate: null, pay_type: 'hourly', hours_allocated: 4, extra_hours: 0, extra_hours_status: 'none' },
      dup: null,
      rate: null, // contractor profile has no rate either
    })
    mockedCreate.mockReturnValue(client)

    const res = await approveContractorPay('j1', 'c1', {})

    expect(res.error).toMatch(/hourly rate/i)
    expect(ciInsert).not.toHaveBeenCalled()
  })

  it('errors when there are no hours and no fixed amount', async () => {
    const { client, ciInsert } = makeSupabase({
      job: COMPLETED_JOB,
      jw: { pay_rate: 35, pay_type: 'hourly', hours_allocated: null, extra_hours: null, extra_hours_status: null },
      dup: null,
    })
    mockedCreate.mockReturnValue(client)

    const res = await approveContractorPay('j1', 'c1', {})

    expect(res.error).toMatch(/approved hours.*fixed amount/i)
    expect(ciInsert).not.toHaveBeenCalled()
  })

  it('blocks non-admin users', async () => {
    const { client, ciInsert } = makeSupabase({ email: 'nope@x.com', job: COMPLETED_JOB })
    mockedCreate.mockReturnValue(client)

    const res = await approveContractorPay('j1', 'c1', {})

    expect(res.error).toMatch(/admin only/i)
    expect(ciInsert).not.toHaveBeenCalled()
  })

  it('refuses a job that is not completed', async () => {
    const { client, ciInsert } = makeSupabase({
      job: { ...COMPLETED_JOB, status: 'in_progress' },
      jw: { pay_rate: 35, pay_type: 'hourly', hours_allocated: 4, extra_hours: 0, extra_hours_status: 'none' },
    })
    mockedCreate.mockReturnValue(client)

    const res = await approveContractorPay('j1', 'c1', {})

    expect(res.error).toMatch(/not completed/i)
    expect(ciInsert).not.toHaveBeenCalled()
  })

  it('refuses when the contractor is not assigned', async () => {
    const { client, ciInsert } = makeSupabase({ job: COMPLETED_JOB, jw: null })
    mockedCreate.mockReturnValue(client)

    const res = await approveContractorPay('j1', 'c1', {})

    expect(res.error).toMatch(/not assigned/i)
    expect(ciInsert).not.toHaveBeenCalled()
  })
})
