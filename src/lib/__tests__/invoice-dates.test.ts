import { computeInvoiceDueDate, resolveServiceDate } from '../invoice-dates'

describe('resolveServiceDate', () => {
  it('returns completed_at when present (trimmed to date)', () => {
    expect(resolveServiceDate({
      job_completed_at: '2026-05-14T11:30:00Z',
      job_scheduled_date: '2026-05-12',
      quote_scheduled_clean_date: '2026-05-10',
    })).toBe('2026-05-14')
  })

  it('falls back to scheduled_date when completed_at is null', () => {
    expect(resolveServiceDate({
      job_completed_at: null,
      job_scheduled_date: '2026-05-12',
      quote_scheduled_clean_date: '2026-05-10',
    })).toBe('2026-05-12')
  })

  it('falls back to quote scheduled_clean_date when no job dates', () => {
    expect(resolveServiceDate({
      quote_scheduled_clean_date: '2026-05-10',
    })).toBe('2026-05-10')
  })

  it('returns null when nothing is set', () => {
    expect(resolveServiceDate({})).toBeNull()
  })
})

describe('computeInvoiceDueDate', () => {
  it('cash_sale: due day before service when service date present', () => {
    expect(computeInvoiceDueDate({
      payment_type: 'cash_sale',
      payment_terms: null,
      date_issued: '2026-05-01',
      service_date: '2026-05-10',
    })).toBe('2026-05-09')
  })

  it('cash_sale: falls back to issued date when no service date', () => {
    expect(computeInvoiceDueDate({
      payment_type: 'cash_sale',
      payment_terms: null,
      date_issued: '2026-05-01',
      service_date: null,
    })).toBe('2026-05-01')
  })

  it('on_account: 14 days from issued (legacy fallback)', () => {
    expect(computeInvoiceDueDate({
      payment_type: 'on_account',
      payment_terms: null,
      date_issued: '2026-05-01',
      service_date: null,
    })).toBe('2026-05-15')
  })

  it('payment_terms 7_days overrides the on_account 14-day fallback', () => {
    expect(computeInvoiceDueDate({
      payment_type: 'on_account',
      payment_terms: '7_days',
      date_issued: '2026-05-01',
    })).toBe('2026-05-08')
  })

  it('payment_terms 14_days returns issued + 14', () => {
    expect(computeInvoiceDueDate({
      payment_type: 'on_account',
      payment_terms: '14_days',
      date_issued: '2026-05-01',
    })).toBe('2026-05-15')
  })

  it('payment_terms 20_of_month returns the next 20th when issued is before the 20th', () => {
    expect(computeInvoiceDueDate({
      payment_type: 'on_account',
      payment_terms: '20_of_month',
      date_issued: '2026-05-10',
    })).toBe('2026-05-20')
  })

  it('payment_terms 20_of_month rolls to next month when issued is after the 20th', () => {
    expect(computeInvoiceDueDate({
      payment_type: 'on_account',
      payment_terms: '20_of_month',
      date_issued: '2026-05-25',
    })).toBe('2026-06-20')
  })

  it('payment_terms due_immediately returns the issued date', () => {
    expect(computeInvoiceDueDate({
      payment_type: 'on_account',
      payment_terms: 'due_immediately',
      date_issued: '2026-05-01',
      service_date: '2026-05-10',
    })).toBe('2026-05-01')
  })

  it('payment_terms due_on_completion returns the service date', () => {
    expect(computeInvoiceDueDate({
      payment_type: 'on_account',
      payment_terms: 'due_on_completion',
      date_issued: '2026-05-01',
      service_date: '2026-05-10',
    })).toBe('2026-05-10')
  })

  it('returns null when nothing usable is supplied', () => {
    expect(computeInvoiceDueDate({
      payment_type: null,
      payment_terms: null,
      date_issued: null,
    })).toBeNull()
  })

  it('20_of_month uses today as fallback when issued is null', () => {
    const out = computeInvoiceDueDate({
      payment_type: 'on_account',
      payment_terms: '20_of_month',
      date_issued: null,
    })
    expect(out).toMatch(/^\d{4}-\d{2}-20$/)
  })
})
