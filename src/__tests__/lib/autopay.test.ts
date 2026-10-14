/** @jest-environment node */
// Automatic payments by direct debit: collect only when the customer is set
// up, only a sent + owing invoice, the right amount, and record what happened.

const created: Array<{ params: Record<string, unknown>; opts: Record<string, unknown> }> = []
let stripeFails: string | null = null
let pmType = 'nz_bank_account'
jest.mock('@/lib/stripe', () => ({
  getStripe: () => ({
    paymentMethods: { retrieve: async () => ({ type: pmType }) },
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

import { autopayLinkToken, collectInvoiceByAutopay, renderAutopaySetupEmail, verifyAutopayLinkToken } from '@/lib/autopay'

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
  created.length = 0; updates.length = 0; emails.length = 0; stripeFails = null; pmType = 'nz_bank_account'
  process.env.AUTOPAY_LINK_SECRET = 'test-secret'
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

describe('saved card instead of bank account', () => {
  it('adds the 2.5% card fee to the charge and records it for the invoice line', async () => {
    pmType = 'card'
    invoiceRow = { ...invoiceRow, gst_included: true }
    await collectInvoiceByAutopay(svc as never, 'inv-1')
    expect(created[0].params).toMatchObject({
      amount: 92250, // $900 + $22.50
      payment_method_types: ['card'],
      metadata: expect.objectContaining({ card_fee: '22.50', card_fee_item_price: '22.50' }),
    })
  })
})

describe('setup link', () => {
  it('verifies its own token and rejects a tampered one', () => {
    const t = autopayLinkToken('c-bella')
    expect(verifyAutopayLinkToken(t)).toBe('c-bella')
    expect(verifyAutopayLinkToken(t.replace('c-bella', 'c-someone-else'))).toBeNull()
    expect(verifyAutopayLinkToken('c-bella.nope')).toBeNull()
    expect(verifyAutopayLinkToken('garbage')).toBeNull()
  })

  it('the email offers bank (no fee) or card (2.5%) and links the setup page', () => {
    const { subject, html } = renderAutopaySetupEmail({ greeting: 'Hi Bella,', url: 'https://sano.nz/api/autopay/x.y' })
    expect(subject).toMatch(/automatic payments/i)
    expect(html).toContain('href="https://sano.nz/api/autopay/x.y"')
    expect(html).toContain('no fee')
    expect(html).toContain('2.5%')
    expect(html).toContain('Hi Bella,')
  })
})
