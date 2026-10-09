import { CARD_FEE_LABEL, applyQuoteCardPayment, cardFee, cardFeeItemPrice, clientCardSetting, invoiceCardPayable, invoiceOffersCard, isOnAccount, isOneOff, quoteCardEligible, quoteCardPayable } from '@/lib/card-payments'

describe('card payment eligibility', () => {
  it('never offers a card to on-account customers', () => {
    expect(isOnAccount('on_account')).toBe(true)
    expect(invoiceCardPayable({ payment_type: 'on_account', status: 'sent' })).toBe(false)
    expect(quoteCardPayable({ payment_type: 'on_account', status: 'accepted', frequency: 'one_off', service_category: 'residential' })).toBe(false)
  })

  it('offers cash-sale invoices that are issued and unpaid', () => {
    expect(invoiceCardPayable({ payment_type: 'cash_sale', status: 'sent' })).toBe(true)
    expect(invoiceCardPayable({ payment_type: 'cash_sale', status: 'overdue' })).toBe(true)
    for (const status of ['draft', 'cancelled', 'paid']) {
      expect(invoiceCardPayable({ payment_type: 'cash_sale', status })).toBe(false)
    }
  })

  it('lets staff override the default either way', () => {
    expect(invoiceOffersCard({ payment_type: 'on_account', allow_card_payment: null })).toBe(false)
    expect(invoiceOffersCard({ payment_type: 'on_account', allow_card_payment: true })).toBe(true)
    expect(invoiceOffersCard({ payment_type: 'cash_sale', allow_card_payment: false })).toBe(false)
    expect(invoiceCardPayable({ payment_type: 'on_account', allow_card_payment: true, status: 'sent' })).toBe(true)
  })

  it('applies the customer "always show" setting unless the invoice overrides it', () => {
    expect(invoiceOffersCard({ payment_type: 'on_account', client_allow_card_payment: true })).toBe(true)
    expect(invoiceOffersCard({ payment_type: 'on_account', allow_card_payment: false, client_allow_card_payment: true })).toBe(false)
    expect(clientCardSetting({ allow_card_payment: true })).toBe(true)
    expect(clientCardSetting([{ allow_card_payment: true }])).toBe(true)
    expect(clientCardSetting(null)).toBe(null)
  })

  it('treats null / One-off / one_off frequency as one-off', () => {
    expect(isOneOff(null)).toBe(true)
    expect(isOneOff('One-off')).toBe(true)
    expect(isOneOff('one_off')).toBe(true)
    expect(isOneOff('weekly')).toBe(false)
  })

  it('offers only accepted one-off non-commercial cash-sale quotes', () => {
    const base = { payment_type: 'cash_sale', status: 'accepted', frequency: 'one_off', service_category: 'residential' }
    expect(quoteCardPayable(base)).toBe(true)
    expect(quoteCardPayable({ ...base, status: 'converted' })).toBe(true)
    expect(quoteCardPayable({ ...base, status: 'sent' })).toBe(false)
    expect(quoteCardPayable({ ...base, frequency: 'weekly' })).toBe(false)
    expect(quoteCardPayable({ ...base, service_category: 'commercial' })).toBe(false)
    // The email mentions paying online before acceptance, so eligibility ignores status.
    expect(quoteCardEligible({ ...base, status: 'sent' })).toBe(true)
    expect(quoteCardEligible({ ...base, payment_type: 'on_account' })).toBe(false)
  })
})

// Minimal chainable Supabase stub: per-table select result + recorded updates.
function stub(tables: Record<string, unknown>) {
  const updates: Array<{ table: string; values: Record<string, unknown> }> = []
  const inserts: Array<{ table: string; values: Record<string, unknown> }> = []
  const client = {
    from(table: string) {
      const q: Record<string, unknown> = {}
      const chain = () => q
      Object.assign(q, {
        select: chain, eq: chain, neq: chain, is: chain,
        maybeSingle: async () => ({ data: tables[table] ?? null, error: null }),
        update(values: Record<string, unknown>) { updates.push({ table, values }); return { eq: () => ({ neq: () => ({ select: async () => ({ data: [{ id: 'x' }], error: null }) }) }) } },
        insert: async (values: Record<string, unknown>) => { inserts.push({ table, values }); return { error: null } },
      })
      return q
    },
  }
  return { client: client as never, updates, inserts }
}

describe('applyQuoteCardPayment', () => {
  const invoice = { id: 'i1', quote_id: 'q1', status: 'draft', base_price: 200, discount: 0, gst_included: false, invoice_items: [] }

  it('marks the invoice paid (NZ date) when the card payment covers the total', async () => {
    const { client, updates } = stub({
      invoices: invoice,
      // 22:00 UTC on the 8th is 11am on the 9th in NZ.
      quotes: { card_paid_at: '2026-10-08T22:00:00Z', card_amount_paid: 230, stripe_payment_intent_id: 'pi_1' },
    })
    expect(await applyQuoteCardPayment(client, 'i1')).toEqual({ applied: true })
    expect(updates[0].values).toEqual({ status: 'paid', date_paid: '2026-10-09', stripe_payment_intent_id: 'pi_1' })
  })

  it('leaves the invoice unpaid when extras were added after the card payment', async () => {
    const { client, updates } = stub({
      invoices: { ...invoice, invoice_items: [{ price: 50 }] },
      quotes: { card_paid_at: '2026-10-08T02:00:00Z', card_amount_paid: 230, stripe_payment_intent_id: 'pi_1' },
    })
    expect(await applyQuoteCardPayment(client, 'i1')).toEqual({ applied: false, shortBy: 57.5 })
    expect(updates).toHaveLength(0)
  })

  it('does nothing when the quote was not paid by card', async () => {
    const { client, updates } = stub({ invoices: invoice, quotes: { card_paid_at: null } })
    expect(await applyQuoteCardPayment(client, 'i1')).toEqual({ applied: false })
    expect(updates).toHaveLength(0)
  })
})

describe('card fee (2.5%)', () => {
  it('is 2.5% to the cent', () => {
    expect(cardFee(840)).toBe(21)
    expect(cardFee(225)).toBe(5.63)
    expect(cardFee(1)).toBe(0.03)
  })

  it('stores the line ex-GST on a GST-exclusive document', () => {
    expect(cardFeeItemPrice(23, true)).toBe(23)
    expect(cardFeeItemPrice(23, false)).toBe(20)
  })

  it('carries a quote card fee onto the invoice as a line, and the rest pays the work', async () => {
    const { client, updates, inserts } = stub({
      invoices: { id: 'i1', quote_id: 'q1', status: 'draft', base_price: 585, discount: 0, gst_included: true, invoice_items: [] },
      quotes: { card_paid_at: '2026-10-08T22:00:00Z', card_amount_paid: 599.63, card_fee_amount: 14.63, stripe_payment_intent_id: 'pi_2' },
    })
    expect(await applyQuoteCardPayment(client, 'i1')).toEqual({ applied: true })
    expect(updates[0].values.status).toBe('paid')
    expect(inserts[0]).toMatchObject({ table: 'invoice_items', values: { label: CARD_FEE_LABEL, price: 14.63 } })
  })
})
