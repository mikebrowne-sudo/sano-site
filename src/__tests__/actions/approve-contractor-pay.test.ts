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
  quote?: Record<string, unknown> | null
  contractor?: Record<string, unknown> | null
}

function selectChain(value: unknown) {
  const chain: Record<string, unknown> = {}
  chain.select = () => chain
  chain.eq = () => chain
  chain.neq = () => chain
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
    if (table === 'contractors') return selectChain(cfg.contractor ?? (cfg.rate != null ? { hourly_rate: cfg.rate } : null))
    if (table === 'quotes') return selectChain(cfg.quote ?? null)
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

  it('manual fixed AMOUNT on an hourly-basis worker: creates an approved CI', async () => {
    // fixedAmount is a manual amount override; the worker's BASIS is still hourly.
    const { client, ciInsert } = makeSupabase({
      job: COMPLETED_JOB,
      jw: { pay_rate: null, pay_type: 'hourly', hours_allocated: null, extra_hours: null, extra_hours_status: null },
      dup: null,
      created: { id: 'ci2', invoice_number: 'CI-0100', amount: 280, status: 'approved' },
    })
    mockedCreate.mockReturnValue(client)

    const res = await approveContractorPay('j1', 'c1', { fixedAmount: 280 })

    expect(res).toMatchObject({ ok: true, payable: { amount: 280 } })
    expect(ciInsert.mock.calls[0][0]).toMatchObject({ amount: 280, status: 'approved' })
  })

  it('sets a concise work-type note from the linked quote (not the full job description)', async () => {
    const { client, ciInsert } = makeSupabase({
      job: { ...COMPLETED_JOB, quote_id: 'q1', description: 'Full move-out scope: kitchen, 2 bathrooms, oven, interior windows, skirting, wardrobes…' },
      jw: { pay_rate: 35, pay_type: 'hourly', hours_allocated: 4, extra_hours: 0, extra_hours_status: 'none' },
      dup: null,
      quote: { type_of_clean: 'End of Tenancy Clean', service_type: null },
      created: { id: 'ci1', invoice_number: 'CI-0099', amount: 140, status: 'approved' },
    })
    mockedCreate.mockReturnValue(client)

    await approveContractorPay('j1', 'c1', {})

    const payload = ciInsert.mock.calls[0][0]
    expect(payload.notes).toBe('End of tenancy clean')
    expect(payload.notes).not.toMatch(/scope|bathrooms|skirting/i)
  })

  it('uses the operator-supplied note over the derived work-type', async () => {
    const { client, ciInsert } = makeSupabase({
      job: { ...COMPLETED_JOB, quote_id: 'q1' },
      jw: { pay_rate: 35, pay_type: 'hourly', hours_allocated: 4, extra_hours: 0, extra_hours_status: 'none' },
      dup: null,
      quote: { type_of_clean: 'Deep Clean' },
      created: { id: 'ci1', invoice_number: 'CI-0099', amount: 140, status: 'approved' },
    })
    mockedCreate.mockReturnValue(client)

    await approveContractorPay('j1', 'c1', { note: 'Regular clean + travel' })

    expect(ciInsert.mock.calls[0][0].notes).toBe('Regular clean + travel')
  })

  it('leaves the note blank when there is no linked quote / work type (not the job description)', async () => {
    const { client, ciInsert } = makeSupabase({
      job: { ...COMPLETED_JOB, quote_id: null, description: 'Some long job description that must NOT become the note' },
      jw: { pay_rate: 35, pay_type: 'hourly', hours_allocated: 4, extra_hours: 0, extra_hours_status: 'none' },
      dup: null,
      created: { id: 'ci1', invoice_number: 'CI-0099', amount: 140, status: 'approved' },
    })
    mockedCreate.mockReturnValue(client)

    await approveContractorPay('j1', 'c1', {})

    expect(ciInsert.mock.calls[0][0].notes).toBeNull()
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

describe('approveContractorPay — fixed-contract basis is not payable per occurrence', () => {
  it('1. an hourly recurring worker CAN be approved normally', async () => {
    const { client, ciInsert } = makeSupabase({
      job: COMPLETED_JOB,
      jw: { pay_rate: 35, pay_type: 'hourly', hours_allocated: 4, extra_hours: 0, extra_hours_status: 'none' },
      dup: null,
      created: { id: 'ci1', invoice_number: 'CI-0099', amount: 140, status: 'approved' },
    })
    mockedCreate.mockReturnValue(client)
    const res = await approveContractorPay('j1', 'c1', {})
    expect(res).toMatchObject({ ok: true })
    expect(ciInsert).toHaveBeenCalledTimes(1)
  })

  it('2. a fixed-basis worker CANNOT create a per-job contractor invoice', async () => {
    const { client, ciInsert } = makeSupabase({
      job: COMPLETED_JOB,
      jw: { pay_rate: 40, pay_type: 'fixed', hours_allocated: null, extra_hours: null, extra_hours_status: null },
      dup: null,
    })
    mockedCreate.mockReturnValue(client)
    const res = await approveContractorPay('j1', 'c1', { fixedAmount: 200 }) // even with a fixed amount
    expect(res.error).toMatch(/fixed-contract basis/i)
    expect(ciInsert).not.toHaveBeenCalled()
  })

  it('4. repeated approval attempts on a fixed-basis worker stay blocked (no bypass)', async () => {
    const { client, ciInsert } = makeSupabase({
      job: COMPLETED_JOB,
      jw: { pay_rate: 40, pay_type: 'fixed', hours_allocated: null, extra_hours: null, extra_hours_status: null },
      dup: null,
    })
    mockedCreate.mockReturnValue(client)
    const a = await approveContractorPay('j1', 'c1', {})
    const b = await approveContractorPay('j1', 'c1', { fixedAmount: 200 })
    expect(a.error).toMatch(/fixed-contract basis/i)
    expect(b.error).toMatch(/fixed-contract basis/i)
    expect(ciInsert).not.toHaveBeenCalled()
  })

  it('5. a manually-added HOURLY worker on a fixed-template job is approved on its own basis', async () => {
    // The job's primary may be fixed, but THIS worker row is hourly → payable.
    const { client, ciInsert } = makeSupabase({
      job: COMPLETED_JOB,
      jw: { pay_rate: 30, pay_type: 'hourly', hours_allocated: 2, extra_hours: 0, extra_hours_status: 'none' },
      dup: null,
      created: { id: 'ci9', invoice_number: 'CI-0110', amount: 60, status: 'approved' },
    })
    mockedCreate.mockReturnValue(client)
    const res = await approveContractorPay('j1', 'c-hourly', {})
    expect(res).toMatchObject({ ok: true })
    expect(ciInsert).toHaveBeenCalledTimes(1)
  })
})

describe('approveContractorPay — GST snapshot at the supply date', () => {
  const hourlyJw = { pay_rate: 35, pay_type: 'hourly', hours_allocated: 4, extra_hours: 0, extra_hours_status: 'none' }

  it('GST-registered contractor → splits 3/23; amount stays GST-inclusive', async () => {
    const { client, ciInsert } = makeSupabase({
      job: COMPLETED_JOB, jw: hourlyJw, dup: null,
      contractor: { hourly_rate: 35, gst_registered: true, gst_number: '123-456-789', gst_effective_date: '2026-04-01', tax_treatment: 'ordinary_trade_creditor' },
      created: { id: 'ci1', invoice_number: 'CI-0099', amount: 140, status: 'approved' },
    })
    mockedCreate.mockReturnValue(client)
    await approveContractorPay('j1', 'c1', {}) // completed_at 2026-05-08 ≥ effective
    const p = ciInsert.mock.calls[0][0]
    expect(p.amount).toBe(140) // full GST-inclusive payable preserved
    expect(p.gst_applied).toBe(true)
    expect(p.gst_amount).toBeCloseTo(140 * 3 / 23, 2)
    expect(p.gst_status).toBe('applied')
  })

  it('non-GST contractor → no GST snapshotted', async () => {
    const { client, ciInsert } = makeSupabase({
      job: COMPLETED_JOB, jw: hourlyJw, dup: null,
      contractor: { hourly_rate: 35, gst_registered: false },
      created: { id: 'ci1', invoice_number: 'CI-0099', amount: 140, status: 'approved' },
    })
    mockedCreate.mockReturnValue(client)
    await approveContractorPay('j1', 'c1', {})
    const p = ciInsert.mock.calls[0][0]
    expect(p.gst_applied).toBe(false)
    expect(p.gst_amount).toBe(0)
    expect(p.gst_status).toBe('not_registered')
  })

  it('pending tax treatment → flagged, GST not applied', async () => {
    const { client, ciInsert } = makeSupabase({
      job: COMPLETED_JOB, jw: hourlyJw, dup: null,
      contractor: { hourly_rate: 35, gst_registered: true, gst_number: '123', gst_effective_date: '2026-04-01', tax_treatment: 'pending_review' },
      created: { id: 'ci1', invoice_number: 'CI-0099', amount: 140, status: 'approved' },
    })
    mockedCreate.mockReturnValue(client)
    await approveContractorPay('j1', 'c1', {})
    const p = ciInsert.mock.calls[0][0]
    expect(p.gst_applied).toBe(false)
    expect(p.gst_status).toBe('pending_review')
  })

  it('supply date (completed_at) BEFORE the effective date → no GST', async () => {
    const { client, ciInsert } = makeSupabase({
      job: { ...COMPLETED_JOB, completed_at: '2026-03-01T00:00:00Z' }, jw: hourlyJw, dup: null,
      contractor: { hourly_rate: 35, gst_registered: true, gst_number: '123', gst_effective_date: '2026-04-01', tax_treatment: 'ordinary_trade_creditor' },
      created: { id: 'ci1', invoice_number: 'CI-0099', amount: 140, status: 'approved' },
    })
    mockedCreate.mockReturnValue(client)
    await approveContractorPay('j1', 'c1', {})
    const p = ciInsert.mock.calls[0][0]
    expect(p.gst_applied).toBe(false)
    expect(p.gst_status).toBe('before_effective_date')
  })
})
