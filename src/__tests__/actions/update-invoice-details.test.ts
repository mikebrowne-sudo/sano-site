/** @jest-environment node */

jest.mock('@/lib/supabase-server')
jest.mock('@/lib/is-admin', () => ({ isAdminUser: (u: { email?: string } | null) => !!u && u.email === 'admin@sano.nz' }))
jest.mock('next/cache', () => ({ revalidatePath: jest.fn() }))

import { updateInvoiceDetails } from '@/app/portal/invoices/[id]/_actions-edit'
import { createClient } from '@/lib/supabase-server'

const mockedCreate = createClient as unknown as jest.Mock

const FINANCIAL = ['status', 'base_price', 'discount', 'gst_included', 'date_paid', 'invoice_number', 'sent_at']
const ALLOWED = new Set([
  'notes', 'service_description', 'service_address', 'type_of_clean', 'client_reference', 'requires_po',
  'contact_name', 'contact_email', 'contact_phone', 'accounts_contact_name', 'accounts_email',
  'date_issued', 'due_date',
])

function makeSupabase(cfg: { email?: string; invoice: Record<string, unknown> | null; updateErr?: { message: string } | null }) {
  const maybeSingle = jest.fn().mockResolvedValue({ data: cfg.invoice })
  const selectEq = { eq: jest.fn().mockReturnValue({ maybeSingle }) }
  const updateEq = jest.fn().mockResolvedValue({ error: cfg.updateErr ?? null })
  const update = jest.fn().mockReturnValue({ eq: updateEq })
  const auditInsert = jest.fn().mockResolvedValue({ error: null })
  const from = jest.fn((table: string) => {
    if (table === 'audit_log') return { insert: auditInsert }
    return { select: jest.fn().mockReturnValue(selectEq), update }
  })
  return { client: { auth: { getUser: async () => ({ data: { user: { id: 'u1', email: cfg.email ?? 'admin@sano.nz' } } }) }, from }, update, auditInsert }
}

const draftInvoice = {
  id: 'i1', invoice_number: 'INV-0050', status: 'draft',
  notes: null, service_description: null, service_address: null, type_of_clean: null, client_reference: null, requires_po: false,
  contact_name: null, contact_email: null, contact_phone: null, accounts_contact_name: null, accounts_email: null,
  date_issued: '2026-05-01', due_date: '2026-05-15',
}

beforeEach(() => mockedCreate.mockReset())

describe('updateInvoiceDetails', () => {
  it('edits a non-financial field on an unsent invoice (no reason needed)', async () => {
    const { client, update, auditInsert } = makeSupabase({ invoice: { ...draftInvoice } })
    mockedCreate.mockReturnValue(client)

    const res = await updateInvoiceDetails({ invoiceId: 'i1', client_reference: 'PO-9' })

    expect(res).toEqual({ ok: true })
    expect(update).toHaveBeenCalledWith({ client_reference: 'PO-9' })
    expect(auditInsert).toHaveBeenCalled()
  })

  it('edits a sent invoice when a reason is given', async () => {
    const { client, update, auditInsert } = makeSupabase({ invoice: { ...draftInvoice, status: 'sent' } })
    mockedCreate.mockReturnValue(client)

    const res = await updateInvoiceDetails({ invoiceId: 'i1', notes: 'Corrected wording', reason: 'client asked' })

    expect(res).toEqual({ ok: true })
    expect(update).toHaveBeenCalledWith({ notes: 'Corrected wording' })
    expect(auditInsert.mock.calls[0][0].after._reason).toBe('client asked')
    expect(auditInsert.mock.calls[0][0].after._was_sent).toBe(true)
  })

  it('blocks a sent-invoice edit without a reason', async () => {
    const { client, update } = makeSupabase({ invoice: { ...draftInvoice, status: 'sent' } })
    mockedCreate.mockReturnValue(client)

    const res = await updateInvoiceDetails({ invoiceId: 'i1', notes: 'x' })

    expect('error' in res && res.error).toMatch(/reason is required/i)
    expect(update).not.toHaveBeenCalled()
  })

  it('blocks non-admin users', async () => {
    const { client, update } = makeSupabase({ email: 'nope@x.com', invoice: { ...draftInvoice } })
    mockedCreate.mockReturnValue(client)

    const res = await updateInvoiceDetails({ invoiceId: 'i1', notes: 'x' })

    expect('error' in res && res.error).toMatch(/admin only/i)
    expect(update).not.toHaveBeenCalled()
  })

  it('only ever writes whitelisted non-financial fields (never status/totals/paid/sent)', async () => {
    const { client, update } = makeSupabase({ invoice: { ...draftInvoice, status: 'sent' } })
    mockedCreate.mockReturnValue(client)

    await updateInvoiceDetails({
      invoiceId: 'i1', notes: 'n', service_description: 'sd', client_reference: 'PO-1',
      requires_po: true, date_issued: '2026-05-02', due_date: '2026-05-20', reason: 'fixes',
    })

    const payload = update.mock.calls[0][0] as Record<string, unknown>
    for (const key of Object.keys(payload)) expect(ALLOWED.has(key)).toBe(true)
    for (const f of FINANCIAL) expect(payload).not.toHaveProperty(f)
  })

  it('returns an error when nothing changed', async () => {
    const { client, update } = makeSupabase({ invoice: { ...draftInvoice, client_reference: 'PO-9' } })
    mockedCreate.mockReturnValue(client)

    const res = await updateInvoiceDetails({ invoiceId: 'i1', client_reference: 'PO-9' })

    expect('error' in res && res.error).toMatch(/no changes/i)
    expect(update).not.toHaveBeenCalled()
  })
})

// Clean type ("End of Tenancy Clean" etc.) is copied off the quote at
// conversion and was previously uneditable, so a wrong service type was stuck
// on the invoice forever. It is descriptive only — nothing prices off it.
describe('updateInvoiceDetails — clean type', () => {
  it('sets the clean type on an unsent invoice', async () => {
    const { client, update } = makeSupabase({ invoice: { ...draftInvoice } })
    mockedCreate.mockReturnValue(client)

    const res = await updateInvoiceDetails({ invoiceId: 'i1', type_of_clean: 'End of Tenancy Clean' })

    expect(res).toEqual({ ok: true })
    expect(update).toHaveBeenCalledWith({ type_of_clean: 'End of Tenancy Clean' })
  })

  it('corrects a legacy value to the canonical label', async () => {
    const { client, update } = makeSupabase({ invoice: { ...draftInvoice, type_of_clean: 'End of Tenancy' } })
    mockedCreate.mockReturnValue(client)

    await updateInvoiceDetails({ invoiceId: 'i1', type_of_clean: 'End of Tenancy Clean' })

    expect(update).toHaveBeenCalledWith({ type_of_clean: 'End of Tenancy Clean' })
  })

  it('accepts an arbitrary hand-typed clean type', async () => {
    const { client, update } = makeSupabase({ invoice: { ...draftInvoice } })
    mockedCreate.mockReturnValue(client)

    await updateInvoiceDetails({ invoiceId: 'i1', type_of_clean: 'Builders clean + window tracks' })

    expect(update).toHaveBeenCalledWith({ type_of_clean: 'Builders clean + window tracks' })
  })

  it('clears the clean type to null rather than an empty string', async () => {
    const { client, update } = makeSupabase({ invoice: { ...draftInvoice, type_of_clean: 'Deep Clean' } })
    mockedCreate.mockReturnValue(client)

    await updateInvoiceDetails({ invoiceId: 'i1', type_of_clean: '' })

    expect(update).toHaveBeenCalledWith({ type_of_clean: null })
  })

  it('still requires a reason to change it on a SENT invoice', async () => {
    const { client, update } = makeSupabase({ invoice: { ...draftInvoice, status: 'sent' } })
    mockedCreate.mockReturnValue(client)

    const res = await updateInvoiceDetails({ invoiceId: 'i1', type_of_clean: 'Deep Clean' })

    expect(res).toEqual({ error: expect.stringContaining('reason') })
    expect(update).not.toHaveBeenCalled()
  })

  it('audits the before/after on a sent invoice with a reason', async () => {
    const { client, auditInsert } = makeSupabase({ invoice: { ...draftInvoice, status: 'sent', type_of_clean: 'Deep Clean' } })
    mockedCreate.mockReturnValue(client)

    await updateInvoiceDetails({ invoiceId: 'i1', type_of_clean: 'End of Tenancy Clean', reason: 'Wrong type selected on the quote' })

    const row = auditInsert.mock.calls[0][0] as { before: Record<string, unknown>; after: Record<string, unknown> }
    expect(row.before.type_of_clean).toBe('Deep Clean')
    expect(row.after.type_of_clean).toBe('End of Tenancy Clean')
    expect(row.after._reason).toBe('Wrong type selected on the quote')
  })

  it('editing the clean type never touches a financial field', async () => {
    const { client, update } = makeSupabase({ invoice: { ...draftInvoice } })
    mockedCreate.mockReturnValue(client)

    await updateInvoiceDetails({ invoiceId: 'i1', type_of_clean: 'Deep Clean' })

    const written = Object.keys(update.mock.calls[0][0] as Record<string, unknown>)
    for (const key of written) expect(ALLOWED.has(key)).toBe(true)
    for (const f of FINANCIAL) expect(written).not.toContain(f)
  })
})
