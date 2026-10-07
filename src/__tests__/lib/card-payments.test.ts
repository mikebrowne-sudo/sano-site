import { applyQuoteCardPayment, invoiceCardPayable, isOnAccount, isOneOff, quoteCardPayable } from '@/lib/card-payments'

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
  })
})

// Minimal chainable Supabase stub: per-table select result + recorded updates.
function stub(tables: Record<string, unknown>) {
  const updates: Array<{ table: string; values: Record<string, unknown> }> = []
  const client = {
    from(table: string) {
      const q: Record<string, unknown> = {}
      const chain = () => q
      Object.assign(q, {
        select: chain, eq: chain, neq: chain, is: chain,
        maybeSingle: async () => ({ data: tables[table] ?? null, error: null }),
        update(values: Record<string, unknown>) { updates.push({ table, values }); return { eq: () => ({ neq: async () => ({ error: null }) }) } },
      })
      return q
    },
  }
  return { client: client as never, updates }
}

describe('applyQuoteCardPayment', () => {
  const invoice = { id: 'i1', quote_id: 'q1', status: 'draft', base_price: 200, discount: 0, gst_included: false, invoice_items: [] }

  it('marks the invoice paid when the card payment covers the total', async () => {
    const { client, updates } = stub({
      invoices: invoice,
      quotes: { card_paid_at: '2026-10-08T02:00:00Z', card_amount_paid: 230, stripe_payment_intent_id: 'pi_1' },
    })
    expect(await applyQuoteCardPayment(client, 'i1')).toEqual({ applied: true })
    expect(updates[0].values).toEqual({ status: 'paid', date_paid: '2026-10-08', stripe_payment_intent_id: 'pi_1' })
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
