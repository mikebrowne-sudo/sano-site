import { evaluatePayableEdit, EDITABLE_PAYABLE_FIELDS, PAYABLE_BLOCK_MESSAGES } from '@/lib/contractor-payable-guard'

describe('evaluatePayableEdit', () => {
  it('allows editing a clean (approved, unpaid, unremitted) payable', () => {
    const g = evaluatePayableEdit({ status: 'approved', datePaid: null, remittances: [] })
    expect(g.editable).toBe(true)
    expect(g.block).toBeNull()
    expect(g.message).toBeNull()
  })

  it('allows editing a pending payable', () => {
    expect(evaluatePayableEdit({ status: 'pending', datePaid: null, remittances: [] }).editable).toBe(true)
  })

  it('blocks a payable whose status is paid', () => {
    const g = evaluatePayableEdit({ status: 'paid', datePaid: null, remittances: [] })
    expect(g.editable).toBe(false)
    expect(g.block).toBe('paid')
    expect(g.message).toBe(PAYABLE_BLOCK_MESSAGES.paid)
  })

  it('treats a set date_paid as paid even if status lags', () => {
    const g = evaluatePayableEdit({ status: 'approved', datePaid: '2026-06-10', remittances: [] })
    expect(g.editable).toBe(false)
    expect(g.block).toBe('paid')
  })

  it('blocks a payable already in a SENT remittance', () => {
    const g = evaluatePayableEdit({ status: 'approved', datePaid: null, remittances: [{ sent: true }] })
    expect(g.block).toBe('sent_remittance')
  })

  it('sent-remittance takes precedence over paid', () => {
    const g = evaluatePayableEdit({ status: 'paid', datePaid: '2026-06-10', remittances: [{ sent: true }] })
    expect(g.block).toBe('sent_remittance')
    expect(g.isPaid).toBe(true)
    expect(g.inSentRemittance).toBe(true)
  })

  it('blocks a payable in a DRAFT (unsent) remittance when otherwise unpaid', () => {
    const g = evaluatePayableEdit({ status: 'approved', datePaid: null, remittances: [{ sent: false }] })
    expect(g.block).toBe('draft_remittance')
    expect(g.inDraftRemittance).toBe(true)
  })

  it('never exposes status / date_paid / invoice_number as editable', () => {
    const fields = EDITABLE_PAYABLE_FIELDS as readonly string[]
    expect(fields).not.toContain('status')
    expect(fields).not.toContain('date_paid')
    expect(fields).not.toContain('invoice_number')
    expect(fields).toEqual(['contractor_id', 'job_id', 'amount', 'date_submitted', 'notes', 'payment_type', 'site_label', 'period_label'])
  })
})
