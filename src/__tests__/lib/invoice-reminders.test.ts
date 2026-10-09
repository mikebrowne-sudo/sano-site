import { buildReminderEmail, daysOverdue, nextReminderStage, reminderStatus } from '@/lib/invoice-reminders'

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
    expect(e.subject).toBe('Friendly reminder: invoice INV-0493 from Sano')
    expect(e.message).toContain('invoice INV-0493 for $420.00 was due on 8 October 2026')
    expect(e.message).toContain('pay by card or bank transfer')
    expect(e.message.startsWith('Hi Jamie,')).toBe(true)
  })

  it('stage 3 states days overdue and asks for payment within 7 days', () => {
    const e = buildReminderEmail({ ...base, stage: 3, daysOverdue: 24 })
    expect(e.subject).toBe('Final reminder: invoice INV-0493 is 24 days overdue')
    expect(e.message).toContain('within the next 7 days')
  })

  it('points to bank details when card payment is not offered', () => {
    const e = buildReminderEmail({ ...base, stage: 2, cardAvailable: false })
    expect(e.message).not.toContain('by card')
    expect(e.message).toContain('Our bank details are on the invoice')
  })
})
