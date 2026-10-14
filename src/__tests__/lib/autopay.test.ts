/** @jest-environment node */
// Automatic payments by direct debit: collect only when the customer is set
// up, only a sent + owing invoice, the right amount, and record what happened.

const created: Array<{ params: Record<string, unknown>; opts: Record<string, unknown> }> = []
let stripeFails: string | null = null
jest.mock('@/lib/stripe', () => ({
  getStripe: () => ({
    paymentIntents: {
      create: async (params: Record<string, unknown>, opts: Record<string, unknown>) => {
        if (stripeFails) throw new Error(stripeFails)
        created.push({ params, opts })
        return { id: 'pi_123' }
      },
    },
  }),
}))
const emails: unknown[] = []
jest.mock('resend', () => ({ Resend: jest.fn().mockImplementation(() => ({ emails: { send: async (m: unknown) => { emails.push(m) } } })) }))
jest.mock('@/lib/invoice-balance', () => ({
  loadAllocatedByInvoice: async () => new Map([['inv-1', 0]]),
  invoiceBalanceDue: () => 900,
}))

import { collectInvoiceByAutopay } from '@/lib/autopay'

let invoiceRow: Record<string, unknown>
const updates: Array<Record<string, unknown>> = []
const svc = {
  from: (table: string) => {
    const q: Record<string, unknown> = {}
    q.select = () => q
    q.eq = () => q
    q.maybeSingle = async () => ({ data: table === 'invoices' ? invoiceRow : null })
    q.update = (u: Record<string, unknown>) => { updates.push(u); return { eq: async () => ({ error: null }) } }
    q.insert = async () => ({ error: null })
    return q
  },
}

const bella = { id: 'c-bella', name: 'Bella Masutti', stripe_customer_id: 'cus_1', autopay_payment_method_id: 'pm_1', autopay_status: 'active' }

beforeEach(() => {
  created.length = 0; updates.length = 0; emails.length = 0; stripeFails = null
  process.env.SANO_NOTIFY_EMAIL = 'hello@sano.nz'; process.env.RESEND_API_KEY = 're_x'
  invoiceRow = { id: 'inv-1', invoice_number: 'INV-0515', status: 'sent', deleted_at: null, autopay_status: null, autopay_payment_intent_id: null, clients: bella }
})

describe('collectInvoiceByAutopay', () => {
  it('debits the balance from the saved NZ bank account and marks it processing', async () => {
    const res = await collectInvoiceByAutopay(svc as never, 'inv-1')
    expect(res).toEqual({ started: true })
    expect(created[0].params).toMatchObject({
      amount: 90000, currency: 'nzd', customer: 'cus_1', payment_method: 'pm_1',
      payment_method_types: ['nz_bank_account'], off_session: true, confirm: true,
      metadata: expect.objectContaining({ kind: 'autopay', invoice_id: 'inv-1' }),
    })
    expect(updates[0]).toMatchObject({ autopay_status: 'processing', autopay_payment_intent_id: 'pi_123' })
  })

  it('does nothing for a customer not on automatic payments', async () => {
    invoiceRow.clients = { ...bella, autopay_status: 'none' }
    expect((await collectInvoiceByAutopay(svc as never, 'inv-1')).started).toBe(false)
    invoiceRow.clients = { ...bella, autopay_status: 'paused' }
    expect((await collectInvoiceByAutopay(svc as never, 'inv-1')).started).toBe(false)
    expect(created).toHaveLength(0)
  })

  it('does nothing for a draft or paid invoice, or one already being collected', async () => {
    for (const patch of [{ status: 'draft' }, { status: 'paid' }, { autopay_status: 'processing' }]) {
      invoiceRow = { ...invoiceRow, status: 'sent', autopay_status: null, ...patch }
      expect((await collectInvoiceByAutopay(svc as never, 'inv-1')).started).toBe(false)
    }
    expect(created).toHaveLength(0)
  })

  it('a retry after a failure is a new debit (different idempotency key)', async () => {
    await collectInvoiceByAutopay(svc as never, 'inv-1')
    invoiceRow = { ...invoiceRow, autopay_status: 'failed', autopay_payment_intent_id: 'pi_failed' }
    await collectInvoiceByAutopay(svc as never, 'inv-1')
    expect(created[0].opts.idempotencyKey).not.toEqual(created[1].opts.idempotencyKey)
  })

  it('records a refused debit as failed and emails the team', async () => {
    stripeFails = 'The mandate is inactive.'
    const res = await collectInvoiceByAutopay(svc as never, 'inv-1')
    expect(res.started).toBe(false)
    expect(updates[0]).toMatchObject({ autopay_status: 'failed', autopay_error: 'The mandate is inactive.' })
    expect(emails).toHaveLength(1)
  })
})
