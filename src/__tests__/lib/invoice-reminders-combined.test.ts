import { buildCombinedReminderEmail, reminderGroupKey, renderCombinedReminderEmailHtml } from '@/lib/invoice-reminders'

const invoices = [
  { invoiceNumber: 'INV-0401', amountDue: 300, dueDate: '2026-09-20', clientReference: 'PO 77', shareUrl: 'https://sano.nz/share/invoice/a' },
  { invoiceNumber: 'INV-0412', amountDue: 150.5, dueDate: '2026-10-01', clientReference: null, shareUrl: 'https://sano.nz/share/invoice/b' },
]

describe('combined overdue reminder', () => {
  it('states the count and the total, and steps up by stage', () => {
    const one = buildCombinedReminderEmail({ stage: 1, greeting: 'Hi Jo,', invoices })
    expect(one.subject).toBe('Friendly reminder: 2 invoices outstanding')
    expect(one.message).toContain('Hi Jo,')
    expect(one.message).toContain('$450.50')

    expect(buildCombinedReminderEmail({ stage: 2, greeting: 'Hi there,', invoices }).subject).toBe('Following up: 2 outstanding invoices')
    const three = buildCombinedReminderEmail({ stage: 3, greeting: 'Hi there,', invoices })
    expect(three.subject).toBe('Overdue invoices: $450.50 outstanding')
    expect(three.message).toContain('within the next 7 days')
  })

  it('lists every invoice with its link, the total and every number as the bank reference', () => {
    const html = renderCombinedReminderEmailHtml({
      message: 'Hi <Jo>,',
      invoices,
      cardAvailable: false,
      bankAccountName: 'Sano Property Services Limited',
      bankAccountNumber: '12-3627-0005597-00',
    })
    expect(html).toContain('href="https://sano.nz/share/invoice/a"')
    expect(html).toContain('href="https://sano.nz/share/invoice/b"')
    expect(html).toContain('$450.50')
    expect(html).toContain('Use INV-0401 as the reference')
    expect(html).toContain('Copies of INV-0401, INV-0412')
    expect(html).toContain('Your ref PO 77')
    expect(html).toContain('Hi &lt;Jo&gt;,')
    expect(html).not.toContain('card fee')
  })

  it('mentions card only when offered', () => {
    const html = renderCombinedReminderEmailHtml({ message: 'x', invoices, cardAvailable: true, bankAccountName: 'a', bankAccountNumber: 'b' })
    expect(html).toContain('2.5% card fee')
  })

  it('groups by recipient address, ignoring case and spaces', () => {
    expect(reminderGroupKey(' Accounts@BT.co.nz ')).toBe(reminderGroupKey('accounts@bt.co.nz'))
  })
})
