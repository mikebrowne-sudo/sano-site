import { validateCustomInvoiceForm } from '../custom-invoice-validation'

const valid = {
  invoice_number: 'INV-26001',
  client_id: '00000000-0000-0000-0000-000000000001',
  date_issued: '2026-01-15',
  due_date: '2026-01-29',
  service_address: '12 Test St',
  service_description: 'Two-bedroom end-of-tenancy clean including oven and fridge interior.',
  notes: 'Internal: discount applied for repeat customer.',
  base_price: 450,
  gst_included: true,
  payment_type: 'on_account' as const,
}

describe('validateCustomInvoiceForm', () => {
  it('accepts a fully-valid input', () => {
    const result = validateCustomInvoiceForm(valid)
    expect(result.ok).toBe(true)
  })

  it('rejects when invoice_number is blank', () => {
    const result = validateCustomInvoiceForm({ ...valid, invoice_number: '' })
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.errors.invoice_number).toMatch(/required/i)
  })

  it('rejects malformed invoice_number', () => {
    const result = validateCustomInvoiceForm({ ...valid, invoice_number: 'X-1' })
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.errors.invoice_number).toMatch(/format/i)
  })

  it('rejects when client_id is blank', () => {
    const result = validateCustomInvoiceForm({ ...valid, client_id: '' })
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.errors.client_id).toMatch(/required/i)
  })

  it('rejects when due_date is before date_issued', () => {
    const result = validateCustomInvoiceForm({ ...valid, date_issued: '2026-02-01', due_date: '2026-01-15' })
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.errors.due_date).toMatch(/on or after/i)
  })

  it('rejects negative base_price', () => {
    const result = validateCustomInvoiceForm({ ...valid, base_price: -1 })
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.errors.base_price).toMatch(/zero or more/i)
  })

  it('accepts empty notes (notes is now optional supporting copy)', () => {
    const result = validateCustomInvoiceForm({ ...valid, notes: '   ' })
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.value.notes).toBeNull()
  })

  it('rejects empty service_description (this is the customer-facing wording)', () => {
    const result = validateCustomInvoiceForm({ ...valid, service_description: '   ' })
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.errors.service_description).toMatch(/required/i)
  })

  it('trims whitespace on service_description', () => {
    const result = validateCustomInvoiceForm({ ...valid, service_description: '  Trimmed copy.  ' })
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.value.service_description).toBe('Trimmed copy.')
  })

  it('rejects unknown payment_type', () => {
    // @ts-expect-error testing runtime guard
    const result = validateCustomInvoiceForm({ ...valid, payment_type: 'crypto' })
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.errors.payment_type).toBeDefined()
  })

  it('rejects malformed date strings', () => {
    const result = validateCustomInvoiceForm({ ...valid, date_issued: '15/01/2026' })
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.errors.date_issued).toMatch(/date/i)
  })
})
