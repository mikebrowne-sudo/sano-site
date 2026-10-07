/** @jest-environment node */

const sendMock = jest.fn().mockResolvedValue({ error: null })
jest.mock('resend', () => ({ Resend: jest.fn().mockImplementation(() => ({ emails: { send: sendMock } })) }))
jest.mock('@/lib/pdf/render-pdf', () => ({ renderPdfFromUrl: jest.fn().mockResolvedValue(Buffer.from('pdf')) }))
jest.mock('@/lib/email-reply-to', () => ({ getCustomerReplyToEmail: () => 'hello@sano.nz' }))

import { sendRecurringInvoiceEmail } from '@/app/portal/recurring-jobs/_lib/send-recurring-invoice'

function makeSvc(invoice: Record<string, unknown>) {
  const updates: Record<string, unknown>[] = []
  const from = jest.fn((t: string) => {
    if (t === 'invoices') {
      return {
        select: () => ({ eq: () => ({ single: jest.fn().mockResolvedValue({ data: invoice }) }) }),
        update: (u: Record<string, unknown>) => { updates.push(u); return { eq: jest.fn().mockResolvedValue({ error: null }) } },
      }
    }
    if (t === 'clients') {
      return { select: () => ({ eq: () => ({ maybeSingle: jest.fn().mockResolvedValue({ data: { email: 'kelsey@example.com', payment_terms: '20_of_month' } }) }) }) }
    }
    return {}
  })
  return { svc: { from } as never, updates }
}

const INV = {
  share_token: 'tok', invoice_number: 'INV-0600', date_issued: null, due_date: '2026-11-20',
  payment_type: 'on_account', scheduled_clean_date: '2026-10-30', client_id: 'cl1', contact_name: 'Kelsey Harvey',
}

beforeEach(() => { sendMock.mockClear(); jest.useFakeTimers({ doNotFake: ['nextTick', 'setImmediate', 'queueMicrotask'] }) })
afterEach(() => jest.useRealTimers())

describe('sendRecurringInvoiceEmail', () => {
  it('stamps the NZ date when the cron fires at 21:00 UTC on the 31st', async () => {
    jest.setSystemTime(Date.parse('2026-10-31T21:00:00Z'))
    const { svc, updates } = makeSvc({ ...INV })
    const res = await sendRecurringInvoiceEmail(svc, 'inv1')
    expect(res).toEqual({ sent: true })
    expect(updates[0]).toMatchObject({ date_issued: '2026-11-01' })
  })

  it('greets the invoice contact by first name', async () => {
    jest.setSystemTime(Date.parse('2026-10-31T21:00:00Z'))
    const { svc } = makeSvc({ ...INV })
    await sendRecurringInvoiceEmail(svc, 'inv1')
    const html = sendMock.mock.calls[0][0].html as string
    expect(html).toContain('Hi Kelsey,')
    expect(html).not.toContain('this month’s cleaning contract')
  })

  it('falls back to "Hi," with no contact', async () => {
    jest.setSystemTime(Date.parse('2026-10-31T21:00:00Z'))
    const { svc } = makeSvc({ ...INV, contact_name: null })
    await sendRecurringInvoiceEmail(svc, 'inv1')
    expect(sendMock.mock.calls[0][0].html).toContain('<p>Hi,</p>')
  })
})
