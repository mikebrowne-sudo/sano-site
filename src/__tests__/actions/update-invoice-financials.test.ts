/** @jest-environment node */

jest.mock('@/lib/supabase-server')
jest.mock('@/lib/is-admin', () => ({ isAdminUser: (u: { email?: string } | null) => !!u && u.email === 'admin@sano.nz' }))
jest.mock('next/cache', () => ({ revalidatePath: jest.fn() }))
jest.mock('@/app/portal/_actions-sensitive-edit', () => ({ logSensitiveEdit: jest.fn().mockResolvedValue({ ok: true }) }))

import { updateInvoiceFinancials } from '@/app/portal/invoices/[id]/_actions-financials'
import { createClient } from '@/lib/supabase-server'
import { logSensitiveEdit } from '@/app/portal/_actions-sensitive-edit'

const mockedCreate = createClient as unknown as jest.Mock
const mockedLog = logSensitiveEdit as unknown as jest.Mock

function makeSupabase(cfg: {
  email?: string
  invoice: Record<string, unknown> | null
  items?: Array<{ label: string | null; price: number | null }>
  updateErr?: { message: string } | null
}) {
  const email = cfg.email ?? 'admin@sano.nz'
  const invMaybe = jest.fn().mockResolvedValue({ data: cfg.invoice })
  const invSelect = jest.fn().mockReturnValue({ eq: jest.fn().mockReturnValue({ maybeSingle: invMaybe }) })
  const invUpdateEq = jest.fn().mockResolvedValue({ error: cfg.updateErr ?? null })
  const invUpdate = jest.fn().mockReturnValue({ eq: invUpdateEq })

  const itemsOrder = jest.fn().mockResolvedValue({ data: cfg.items ?? [] })
  const itemsSelect = jest.fn().mockReturnValue({ eq: jest.fn().mockReturnValue({ order: itemsOrder }) })
  const itemsDelete = jest.fn().mockReturnValue({ eq: jest.fn().mockResolvedValue({ error: null }) })
  const itemsInsert = jest.fn().mockResolvedValue({ error: null })

  const from = jest.fn((table: string) => {
    if (table === 'invoices') return { select: invSelect, update: invUpdate }
    if (table === 'invoice_items') return { select: itemsSelect, delete: itemsDelete, insert: itemsInsert }
    return {}
  })
  return { client: { auth: { getUser: async () => ({ data: { user: { id: 'u1', email } } }) }, from }, from, invUpdate, itemsInsert }
}

const draft = { id: 'i1', invoice_number: 'INV-0050', status: 'draft', base_price: 300, discount: 0, gst_included: false }

beforeEach(() => { mockedCreate.mockReset(); mockedLog.mockClear() })

describe('updateInvoiceFinancials', () => {
  it('edits a line item and recalculates the total', async () => {
    const { client, invUpdate, itemsInsert } = makeSupabase({ invoice: { ...draft }, items: [{ label: 'Carpet', price: 50 }] })
    mockedCreate.mockReturnValue(client)

    const res = await updateInvoiceFinancials({ invoiceId: 'i1', base_price: 300, discount: 0, gst_included: false, items: [{ label: 'Carpet clean', price: 80 }] })

    expect(res).toEqual({ ok: true, total: 380 })
    expect(invUpdate).toHaveBeenCalledWith({ base_price: 300, discount: 0, gst_included: false })
    expect(itemsInsert).toHaveBeenCalled()
    expect(mockedLog).toHaveBeenCalledWith(expect.objectContaining({ beforeTotal: 350, afterTotal: 380, entity: 'invoice' }))
  })

  it('recalculates when the base price changes', async () => {
    const { client } = makeSupabase({ invoice: { ...draft }, items: [] })
    mockedCreate.mockReturnValue(client)
    const res = await updateInvoiceFinancials({ invoiceId: 'i1', base_price: 250, discount: 20, gst_included: false, items: [] })
    expect(res).toEqual({ ok: true, total: 230 })
  })

  it('requires a reason on a sent invoice and writes nothing without one', async () => {
    const { client, invUpdate } = makeSupabase({ invoice: { ...draft, status: 'sent' }, items: [] })
    mockedCreate.mockReturnValue(client)

    const res = await updateInvoiceFinancials({ invoiceId: 'i1', base_price: 250, discount: 0, gst_included: false, items: [] })

    expect('error' in res && res.error).toMatch(/reason is required/i)
    expect(invUpdate).not.toHaveBeenCalled()
    expect(mockedLog).not.toHaveBeenCalled()
  })

  it('saves a sent invoice with a reason, never touching status/sent/paid', async () => {
    const { client, invUpdate } = makeSupabase({ invoice: { ...draft, status: 'sent' }, items: [] })
    mockedCreate.mockReturnValue(client)

    const res = await updateInvoiceFinancials({ invoiceId: 'i1', base_price: 250, discount: 0, gst_included: false, items: [], reason: 'agreed reduction' })

    expect(res).toMatchObject({ ok: true })
    const payload = invUpdate.mock.calls[0][0]
    for (const banned of ['status', 'sent_at', 'date_paid', 'invoice_number']) expect(payload).not.toHaveProperty(banned)
    expect(mockedLog).toHaveBeenCalledWith(expect.objectContaining({ reason: 'agreed reduction', milestone: { sent: true, paid: false } }))
  })

  it('allows a paid-invoice edit with a reason (flags milestone paid)', async () => {
    const { client } = makeSupabase({ invoice: { ...draft, status: 'paid' }, items: [] })
    mockedCreate.mockReturnValue(client)
    const res = await updateInvoiceFinancials({ invoiceId: 'i1', base_price: 250, discount: 0, gst_included: false, items: [], reason: 'correction' })
    expect(res).toMatchObject({ ok: true })
    expect(mockedLog).toHaveBeenCalledWith(expect.objectContaining({ milestone: { sent: true, paid: true } }))
  })

  it('blocks non-admins', async () => {
    const { client, invUpdate } = makeSupabase({ email: 'nope@x.com', invoice: { ...draft }, items: [] })
    mockedCreate.mockReturnValue(client)
    const res = await updateInvoiceFinancials({ invoiceId: 'i1', base_price: 1, discount: 0, gst_included: false, items: [] })
    expect('error' in res && res.error).toMatch(/admin only/i)
    expect(invUpdate).not.toHaveBeenCalled()
  })

  it('never touches contractor / remittance tables', async () => {
    const { client, from } = makeSupabase({ invoice: { ...draft }, items: [] })
    mockedCreate.mockReturnValue(client)
    await updateInvoiceFinancials({ invoiceId: 'i1', base_price: 999, discount: 0, gst_included: false, items: [] })
    const tables = from.mock.calls.map((c) => c[0])
    expect(tables).not.toContain('contractor_invoices')
    expect(tables).not.toContain('contractor_remittances')
    expect(tables).not.toContain('contractor_remittance_items')
  })
})
