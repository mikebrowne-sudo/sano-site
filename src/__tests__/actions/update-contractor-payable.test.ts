/** @jest-environment node */

jest.mock('@/lib/supabase-server')
jest.mock('@/lib/is-admin', () => ({ isAdminUser: (u: { email?: string } | null) => !!u && u.email === 'admin@sano.nz' }))
jest.mock('next/cache', () => ({ revalidatePath: jest.fn() }))
jest.mock('@/app/portal/_actions-sensitive-edit', () => ({ logSensitiveEdit: jest.fn().mockResolvedValue({ ok: true }) }))

import { updateContractorPayable } from '@/app/portal/contractor-invoices/_actions-payable-edit'
import { createClient } from '@/lib/supabase-server'
import { logSensitiveEdit } from '@/app/portal/_actions-sensitive-edit'

const mockedCreate = createClient as unknown as jest.Mock
const mockedLog = logSensitiveEdit as unknown as jest.Mock

function makeSupabase(cfg: {
  email?: string
  ci: Record<string, unknown> | null
  links?: Array<{ contractor_remittances: { sent_at: string | null } | null }>
  updateErr?: { message: string } | null
}) {
  const email = cfg.email ?? 'admin@sano.nz'
  const ciMaybe = jest.fn().mockResolvedValue({ data: cfg.ci })
  const ciSelect = jest.fn().mockReturnValue({ eq: jest.fn().mockReturnValue({ maybeSingle: ciMaybe }) })
  const ciUpdateEq = jest.fn().mockResolvedValue({ error: cfg.updateErr ?? null })
  const ciUpdate = jest.fn().mockReturnValue({ eq: ciUpdateEq })

  const linkEq = jest.fn().mockResolvedValue({ data: cfg.links ?? [] })
  const linkSelect = jest.fn().mockReturnValue({ eq: linkEq })

  const from = jest.fn((table: string) => {
    if (table === 'contractor_invoices') return { select: ciSelect, update: ciUpdate }
    if (table === 'contractor_remittance_items') return { select: linkSelect }
    return {}
  })
  return { client: { auth: { getUser: async () => ({ data: { user: { id: 'u1', email } } }) }, from }, from, ciUpdate }
}

const approved = {
  id: 'p1', invoice_number: 'CI-0007', contractor_id: 'c1', job_id: 'j1',
  amount: 100, date_submitted: '2026-06-01', date_paid: null, status: 'approved', notes: 'orig',
}

const base = { id: 'p1', contractor_id: 'c1', job_id: 'j1', date_submitted: '2026-06-01', notes: 'orig', reason: 'agreed correction' }

beforeEach(() => { mockedCreate.mockReset(); mockedLog.mockClear() })

describe('updateContractorPayable', () => {
  it('edits a clean payable, recording before/after total and never touching status/paid', async () => {
    const { client, ciUpdate } = makeSupabase({ ci: { ...approved } })
    mockedCreate.mockReturnValue(client)

    const res = await updateContractorPayable({ ...base, amount: 150 })

    expect(res).toEqual({ ok: true, total: 150 })
    const payload = ciUpdate.mock.calls[0][0]
    expect(payload).toMatchObject({ contractor_id: 'c1', job_id: 'j1', amount: 150, date_submitted: '2026-06-01', notes: 'orig' })
    for (const banned of ['status', 'date_paid', 'invoice_number']) expect(payload).not.toHaveProperty(banned)
    expect(mockedLog).toHaveBeenCalledWith(expect.objectContaining({ entity: 'contractor_invoice', beforeTotal: 100, afterTotal: 150, reason: 'agreed correction' }))
  })

  it('requires a reason and writes nothing without one', async () => {
    const { client, ciUpdate } = makeSupabase({ ci: { ...approved } })
    mockedCreate.mockReturnValue(client)

    const res = await updateContractorPayable({ ...base, amount: 150, reason: '   ' })

    expect('error' in res && res.error).toMatch(/reason is required/i)
    expect(ciUpdate).not.toHaveBeenCalled()
    expect(mockedLog).not.toHaveBeenCalled()
  })

  it('blocks editing a paid payable', async () => {
    const { client, ciUpdate } = makeSupabase({ ci: { ...approved, status: 'paid' } })
    mockedCreate.mockReturnValue(client)
    const res = await updateContractorPayable({ ...base, amount: 150 })
    expect('error' in res && res.error).toMatch(/marked paid/i)
    expect(ciUpdate).not.toHaveBeenCalled()
    expect(mockedLog).not.toHaveBeenCalled()
  })

  it('blocks editing a payable already in a sent remittance', async () => {
    const { client, ciUpdate } = makeSupabase({ ci: { ...approved }, links: [{ contractor_remittances: { sent_at: '2026-06-05' } }] })
    mockedCreate.mockReturnValue(client)
    const res = await updateContractorPayable({ ...base, amount: 150 })
    expect('error' in res && res.error).toMatch(/sent remittance/i)
    expect(ciUpdate).not.toHaveBeenCalled()
  })

  it('blocks editing a payable in a draft (unsent) remittance', async () => {
    const { client, ciUpdate } = makeSupabase({ ci: { ...approved }, links: [{ contractor_remittances: { sent_at: null } }] })
    mockedCreate.mockReturnValue(client)
    const res = await updateContractorPayable({ ...base, amount: 150 })
    expect('error' in res && res.error).toMatch(/draft remittance batch/i)
    expect(ciUpdate).not.toHaveBeenCalled()
  })

  it('blocks non-admins', async () => {
    const { client, ciUpdate } = makeSupabase({ email: 'nope@x.com', ci: { ...approved } })
    mockedCreate.mockReturnValue(client)
    const res = await updateContractorPayable({ ...base, amount: 150 })
    expect('error' in res && res.error).toMatch(/admin only/i)
    expect(ciUpdate).not.toHaveBeenCalled()
  })

  it('rejects a non-positive amount', async () => {
    const { client, ciUpdate } = makeSupabase({ ci: { ...approved } })
    mockedCreate.mockReturnValue(client)
    const res = await updateContractorPayable({ ...base, amount: 0 })
    expect('error' in res && res.error).toMatch(/greater than zero/i)
    expect(ciUpdate).not.toHaveBeenCalled()
  })

  it('never creates or touches remittance tables on a write', async () => {
    const { client, from } = makeSupabase({ ci: { ...approved } })
    mockedCreate.mockReturnValue(client)
    await updateContractorPayable({ ...base, amount: 150 })
    const writes = from.mock.calls.map((c) => c[0])
    // remittance_items is only read (for the guard), never contractor_remittances written.
    expect(writes).not.toContain('contractor_remittances')
  })
})
