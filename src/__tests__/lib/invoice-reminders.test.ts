import { buildReminderEmail, daysOverdue, nextReminderStage, reminderStatus, renderReminderEmailHtml } from '@/lib/invoice-reminders'

describe('invoice reminder schedule', () => {
  it('counts whole days overdue on NZ dates', () => {
    expect(daysOverdue('2026-10-01', '2026-10-09')).toBe(8)
    expect(daysOverdue('2026-10-09', '2026-10-09')).toBe(0)
    expect(daysOverdue(null, '2026-10-09')).toBe(0)
  })

  it('suggests reminders at 3 / 10 / 21 days, then a call', () => {
    expect(reminderStatus(0, 0)).toEqual({ kind: 'not_due' })
    expect(reminderStatus(2, 0)).toEqual({ kind: 'waiting', stage: 1, dueInDays: 1 })
    expect(reminderStatus(3, 0)).toEqual({ kind: 'due', stage: 1 })
    expect(reminderStatus(9, 1)).toEqual({ kind: 'waiting', stage: 2, dueInDays: 1 })
    expect(reminderStatus(10, 1)).toEqual({ kind: 'due', stage: 2 })
    expect(reminderStatus(40, 2)).toEqual({ kind: 'due', stage: 3 })
    expect(reminderStatus(40, 3)).toEqual({ kind: 'call' })
  })

  it('never goes past the final stage', () => {
    expect(nextReminderStage(0)).toBe(1)
    expect(nextReminderStage(5)).toBe(3)
  })
})

describe('reminder email wording', () => {
  const base = { greeting: 'Hi Jamie,', invoiceNumber: 'INV-0493', amountDue: 420, dueDate: '2026-10-08', daysOverdue: 3, cardAvailable: true }

  it('stage 1 is friendly and quotes the balance owed', () => {
    const e = buildReminderEmail({ ...base, stage: 1 })
    expect(e.subject).toBe('Friendly reminder: invoice INV-0493')
    expect(e.message).toContain('invoice INV-0493 for $420.00 was due on 8 October 2026')
    expect(e.message.startsWith('Hi Jamie,')).toBe(true)
  })

  it('stays courteous at every stage — no "final" or demands', () => {
    for (const stage of [1, 2, 3] as const) {
      const e = buildReminderEmail({ ...base, stage, daysOverdue: 24 })
      expect(`${e.subject} ${e.message}`).not.toMatch(/final|immediately|legal|debt collect/i)
    }
    expect(buildReminderEmail({ ...base, stage: 3, daysOverdue: 24 }).subject).toBe('Invoice INV-0493 is now 24 days overdue')
  })
})

describe('reminder email layout', () => {
  const base = {
    message: 'Hi Jamie,\n\nJust a friendly reminder.',
    invoiceNumber: 'INV-0493',
    amountDue: 840,
    dueDate: '2026-10-08',
    clientReference: 'PO-77',
    shareUrl: 'https://sano.nz/share/invoice/t',
    bankAccountName: 'Sano Property Services Limited',
    bankAccountNumber: '12-3627-0005597-00',
  }

  it('leads with the amount, bank details and the invoice number as reference', () => {
    const html = renderReminderEmailHtml({ ...base, cardAvailable: false })
    expect(html).toContain('Amount outstanding')
    expect(html).toContain('$840.00')
    expect(html).toContain('12-3627-0005597-00')
    expect(html).toContain('PO-77')
    expect(html).toContain('>View invoice<')
    expect(html).not.toMatch(/card/i) // on-account: bank details only
  })

  it('mentions card quietly, after the bank details, only when offered', () => {
    const html = renderReminderEmailHtml({ ...base, cardAvailable: true })
    expect(html).toContain('View invoice or pay online')
    expect(html).toContain('2.5% card fee')
    expect(html.indexOf('Pay by bank transfer')).toBeLessThan(html.indexOf('2.5% card fee'))
  })
})
