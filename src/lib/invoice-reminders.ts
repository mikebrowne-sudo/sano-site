// Overdue-invoice reminders — sent by staff from the invoice page (manual
// button; nothing goes out on its own). Three stages, each a step firmer:
//
//   1. Friendly reminder   — suggested from 3 days overdue
//   2. Second reminder     — suggested from 10 days overdue
//   3. Final reminder      — suggested from 21 days overdue
//
// After the third, the invoice is flagged for a phone call instead. The
// schedule only drives the "Reminder due" hint; staff can send any time.
// Every reminder quotes the BALANCE still owed (part payments deducted).

export const REMINDER_SCHEDULE_DAYS = [3, 10, 21] as const
export type ReminderStage = 1 | 2 | 3

/** Whole days between the due date and today (NZ dates, 'YYYY-MM-DD'). */
export function daysOverdue(dueDate: string | null | undefined, today: string): number {
  if (!dueDate) return 0
  const [y1, m1, d1] = dueDate.split('-').map(Number)
  const [y2, m2, d2] = today.split('-').map(Number)
  return Math.round((Date.UTC(y2, m2 - 1, d2) - Date.UTC(y1, m1 - 1, d1)) / 86400000)
}

/** The stage the next reminder would be (the final wording repeats after 3). */
export function nextReminderStage(sentCount: number): ReminderStage {
  return Math.min(3, Math.max(1, sentCount + 1)) as ReminderStage
}

export type ReminderStatus =
  | { kind: 'not_due' }
  | { kind: 'due'; stage: ReminderStage }
  | { kind: 'waiting'; stage: ReminderStage; dueInDays: number }
  | { kind: 'call' } // all three sent — follow up by phone

/** Where an unpaid invoice sits on the 3 / 10 / 21-day schedule. */
export function reminderStatus(days: number, sentCount: number): ReminderStatus {
  if (sentCount >= REMINDER_SCHEDULE_DAYS.length) return { kind: 'call' }
  const threshold = REMINDER_SCHEDULE_DAYS[sentCount]
  const stage = nextReminderStage(sentCount)
  if (days >= threshold) return { kind: 'due', stage }
  if (sentCount === 0 && days < 1) return { kind: 'not_due' }
  return { kind: 'waiting', stage, dueInDays: threshold - days }
}

export const REMINDER_LABEL: Record<ReminderStage, string> = {
  1: 'Friendly reminder',
  2: 'Second reminder',
  3: 'Final reminder',
}

function fmtMoney(n: number): string {
  return new Intl.NumberFormat('en-NZ', { style: 'currency', currency: 'NZD' }).format(n)
}

function fmtLongDate(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString('en-NZ', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' })
}

export interface ReminderEmailInput {
  stage: ReminderStage
  /** "Hi Jamie," / "Hi there," — see lib/email-greeting. */
  greeting: string
  invoiceNumber: string
  amountDue: number
  dueDate: string | null
  daysOverdue: number
  /** Card payment is offered on this invoice (live Stripe + not switched off). */
  cardAvailable: boolean
  clientReference?: string | null
}

/** Subject + editable body for a reminder. Plain text; the send wraps it. */
export function buildReminderEmail(i: ReminderEmailInput): { subject: string; message: string } {
  const amount = fmtMoney(i.amountDue)
  const due = i.dueDate ? fmtLongDate(i.dueDate) : null
  const ref = i.clientReference ? `\n\nYour reference: ${i.clientReference}` : ''
  const howToPay = i.cardAvailable
    ? 'You can view the invoice and pay by card or bank transfer using the link below.'
    : 'You can view the invoice using the link below. Our bank details are on the invoice; please use the invoice number as the reference.'
  const signOff = '\n\nKind regards,\nThe Sano team'

  if (i.stage === 1) {
    return {
      subject: `Friendly reminder: invoice ${i.invoiceNumber} from Sano`,
      message:
        `${i.greeting}\n\nJust a friendly reminder that invoice ${i.invoiceNumber} for ${amount}` +
        `${due ? ` was due on ${due}` : ' is now due'}. If you've already paid, thank you, and please disregard this email.` +
        `${ref}\n\n${howToPay}${signOff}`,
    }
  }

  if (i.stage === 2) {
    return {
      subject: `Second reminder: invoice ${i.invoiceNumber} is overdue`,
      message:
        `${i.greeting}\n\nOur records show that invoice ${i.invoiceNumber} for ${amount}` +
        `${due ? `, due on ${due},` : ''} is still outstanding. We'd appreciate payment at your earliest convenience.` +
        `${ref}\n\n${howToPay}\n\nIf there's a problem with the invoice, just reply to this email and we'll sort it out.${signOff}`,
    }
  }

  return {
    subject: `Final reminder: invoice ${i.invoiceNumber} is ${i.daysOverdue} days overdue`,
    message:
      `${i.greeting}\n\nInvoice ${i.invoiceNumber} for ${amount}` +
      `${due ? ` was due on ${due} and` : ''} is now ${i.daysOverdue} days overdue. ` +
      `Please arrange payment within the next 7 days, or reply to let us know when we can expect it.` +
      `${ref}\n\n${howToPay}\n\nIf you've already paid, please reply with the payment date so we can match it on our side.${signOff}`,
  }
}
