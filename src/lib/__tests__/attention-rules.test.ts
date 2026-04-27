import {
  getQuoteAttention,
  getJobAttention,
  getInvoiceAttention,
  SENT_FOLLOWUP_DAYS,
} from '../attention-rules'

const NOW = '2026-04-27T12:00:00Z'

function daysAgo(n: number): string {
  return new Date(Date.parse(NOW) - n * 24 * 60 * 60 * 1000).toISOString()
}

function hoursFromNow(h: number): string {
  return new Date(Date.parse(NOW) + h * 60 * 60 * 1000).toISOString().slice(0, 10)
}

describe('getQuoteAttention', () => {
  it('flags drafts as Unsent draft', () => {
    const r = getQuoteAttention({ status: 'draft', created_at: daysAgo(0) }, NOW)
    expect(r.needsAttention).toBe(true)
    expect(r.reasons).toContain('Unsent draft')
    expect(r.nextStep).toMatch(/Send/)
  })

  it('does NOT flag a recently-sent quote (inside grace window)', () => {
    const r = getQuoteAttention({
      status: 'sent',
      created_at: daysAgo(SENT_FOLLOWUP_DAYS - 1),
      date_issued: daysAgo(SENT_FOLLOWUP_DAYS - 1),
    }, NOW)
    expect(r.needsAttention).toBe(false)
  })

  it('flags Follow up required once SENT_FOLLOWUP_DAYS has passed', () => {
    const r = getQuoteAttention({
      status: 'sent',
      created_at: daysAgo(SENT_FOLLOWUP_DAYS + 1),
      date_issued: daysAgo(SENT_FOLLOWUP_DAYS + 1),
    }, NOW)
    expect(r.needsAttention).toBe(true)
    expect(r.reasons).toContain('Follow up required')
  })

  it('flags accepted-not-converted as Ready for job', () => {
    const r = getQuoteAttention({
      status: 'accepted',
      created_at: daysAgo(2),
      hasJob: false,
      hasInvoice: false,
    }, NOW)
    expect(r.needsAttention).toBe(true)
    expect(r.reasons).toContain('Ready for job')
    expect(r.nextStep).toMatch(/Create job/)
  })

  it('does NOT flag accepted quotes that already have a job', () => {
    const r = getQuoteAttention({
      status: 'accepted',
      created_at: daysAgo(2),
      hasJob: true,
    }, NOW)
    expect(r.needsAttention).toBe(false)
  })

  it('does NOT flag converted/declined quotes', () => {
    expect(getQuoteAttention({ status: 'converted', created_at: daysAgo(1) }, NOW).needsAttention).toBe(false)
    expect(getQuoteAttention({ status: 'declined',  created_at: daysAgo(1) }, NOW).needsAttention).toBe(false)
  })
})

describe('getJobAttention', () => {
  it('flags a draft with no schedule + no contractor', () => {
    const r = getJobAttention({
      status: 'draft', scheduled_date: null, contractor_id: null,
    }, NOW)
    expect(r.reasons).toEqual(expect.arrayContaining(['Needs scheduling', 'Unassigned']))
    expect(r.needsAttention).toBe(true)
  })

  it('flags At risk when scheduled within 24h with no contractor', () => {
    const r = getJobAttention({
      status: 'assigned',
      scheduled_date: hoursFromNow(12),
      contractor_id: null,
    }, NOW)
    expect(r.reasons).toContain('At risk')
  })

  it('does NOT flag fully-scheduled assigned jobs', () => {
    const r = getJobAttention({
      status: 'assigned',
      scheduled_date: hoursFromNow(72),
      contractor_id: 'abc',
    }, NOW)
    expect(r.needsAttention).toBe(false)
  })

  it('flags completed jobs as Ready to invoice', () => {
    const r = getJobAttention({
      status: 'completed',
      scheduled_date: hoursFromNow(-24),
      contractor_id: 'abc',
    }, NOW)
    expect(r.needsAttention).toBe(true)
    expect(r.reasons).toContain('Ready to invoice')
    expect(r.nextStep).toMatch(/Create invoice/)
  })

  it('does NOT flag invoiced jobs', () => {
    const r = getJobAttention({
      status: 'invoiced',
      scheduled_date: hoursFromNow(-72),
      contractor_id: 'abc',
    }, NOW)
    expect(r.needsAttention).toBe(false)
  })

  it('treats assigned_to text as a valid contractor for unassigned check', () => {
    const r = getJobAttention({
      status: 'assigned',
      scheduled_date: hoursFromNow(72),
      contractor_id: null,
      assigned_to: 'Kelly',
    }, NOW)
    expect(r.reasons).not.toContain('Unassigned')
  })
})

describe('getInvoiceAttention', () => {
  it('flags drafts as Not sent', () => {
    const r = getInvoiceAttention({ status: 'draft', due_date: null }, NOW)
    expect(r.needsAttention).toBe(true)
    expect(r.reasons).toContain('Not sent')
  })

  it('flags overdue when sent and due_date is in the past', () => {
    const r = getInvoiceAttention({
      status: 'sent',
      due_date: daysAgo(1).slice(0, 10),
    }, NOW)
    expect(r.reasons).toContain('Overdue')
    expect(r.nextStep).toMatch(/Follow up/)
  })

  it('flags Outstanding when sent and not yet due', () => {
    const r = getInvoiceAttention({
      status: 'sent',
      due_date: hoursFromNow(72),
    }, NOW)
    expect(r.reasons).toContain('Outstanding')
    expect(r.reasons).not.toContain('Overdue')
  })

  it('does NOT flag paid or cancelled', () => {
    expect(getInvoiceAttention({ status: 'paid',      due_date: null }, NOW).needsAttention).toBe(false)
    expect(getInvoiceAttention({ status: 'cancelled', due_date: null }, NOW).needsAttention).toBe(false)
  })
})
