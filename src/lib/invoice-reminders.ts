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

/**
 * Subject + editable message for a reminder. Plain text, warm and short — the
 * amount, due date, bank details, invoice link and PDF are added underneath by
 * renderReminderEmailHtml (which also signs off), so the message never has to carry them.
 */
export function buildReminderEmail(i: ReminderEmailInput): { subject: string; message: string } {
  const amount = fmtMoney(i.amountDue)
  const due = i.dueDate ? fmtLongDate(i.dueDate) : null
  const below = 'The payment details and a copy of the invoice are below.'

  if (i.stage === 1) {
    return {
      subject: `Friendly reminder: invoice ${i.invoiceNumber}`,
      message:
        `${i.greeting}\n\nJust a friendly reminder that invoice ${i.invoiceNumber} for ${amount}` +
        `${due ? ` was due on ${due}` : ' is now due'}. If it's already on its way, thank you, and please ignore this email.` +
        `\n\n${below}`,
    }
  }

  if (i.stage === 2) {
    return {
      subject: `Following up: invoice ${i.invoiceNumber}`,
      message:
        `${i.greeting}\n\nWe're just following up on invoice ${i.invoiceNumber} for ${amount}` +
        `${due ? `, which was due on ${due}` : ''} and is still showing as outstanding on our side. ` +
        `If anything is holding it up, or there's something on the invoice you'd like to check, just reply and we'll be happy to help.` +
        `\n\n${below}`,
    }
  }

  return {
    subject: `Invoice ${i.invoiceNumber} is now ${i.daysOverdue} days overdue`,
    message:
      `${i.greeting}\n\nInvoice ${i.invoiceNumber} for ${amount}` +
      `${due ? ` was due on ${due} and` : ''} is now ${i.daysOverdue} days overdue. ` +
      `We'd be grateful if you could arrange payment within the next 7 days, or simply reply to let us know when we can expect it. ` +
      `If you've already paid, please send us the payment date so we can match it on our side.` +
      `\n\n${below}`,
  }
}

// ── Email HTML ───────────────────────────────────────────────────────────────
// The reminder email body: the staff-edited message, then a tidy summary card
// with what's owed and how to pay. Bank transfer leads (it's what we prefer
// and it's free); card is offered quietly underneath, only where it's on.
// Table + inline styles so it renders the same in Outlook, Gmail and phones.

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

export interface ReminderHtmlInput {
  message: string
  invoiceNumber: string
  amountDue: number
  dueDate: string | null
  clientReference?: string | null
  shareUrl: string
  cardAvailable: boolean
  bankAccountName: string
  bankAccountNumber: string
}

export function renderReminderEmailHtml(i: ReminderHtmlInput): string {
  const SAGE = '#076653'
  const INK = '#06231D'
  const MUTED = '#5C6B64'
  const LINE = '#E0EAE3'
  const CREAM = '#FAF9F6'
  const row = (label: string, value: string, strong = false) => `
        <tr>
          <td style="padding:7px 0;color:${MUTED};font-size:14px;">${esc(label)}</td>
          <td style="padding:7px 0;color:${INK};font-size:14px;text-align:right;${strong ? 'font-weight:700;' : 'font-weight:600;'}">${esc(value)}</td>
        </tr>`
  const section = (title: string) => `
        <tr><td colspan="2" style="padding:14px 0 4px;border-top:1px solid ${LINE};color:${SAGE};font-size:11px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;">${esc(title)}</td></tr>`

  const summary = [
    row('Invoice', i.invoiceNumber),
    ...(i.dueDate ? [row('Due date', fmtLongDate(i.dueDate))] : []),
    ...(i.clientReference ? [row('Your reference', i.clientReference)] : []),
    row('Amount outstanding', fmtMoney(i.amountDue), true),
  ].join('')

  const bank = [
    section('Pay by bank transfer'),
    row('Account name', i.bankAccountName),
    row('Account number', i.bankAccountNumber),
    row('Reference', i.invoiceNumber),
  ].join('')

  const button = `
    <p style="margin:22px 0 6px;">
      <a href="${esc(i.shareUrl)}" style="display:inline-block;padding:11px 22px;background:${SAGE};color:#ffffff;text-decoration:none;border-radius:8px;font-weight:600;font-size:14px;">View invoice${i.cardAvailable ? ' or pay online' : ''}</a>
    </p>`
  const cardNote = i.cardAvailable
    ? `<p style="margin:6px 0 0;color:${MUTED};font-size:12px;">Card payments are also accepted through the invoice link (a 2.5% card fee applies).</p>`
    : ''

  return `
  <div style="font-family:Arial,Helvetica,sans-serif;color:${INK};font-size:15px;line-height:1.55;max-width:560px;">
    <p style="margin:0 0 18px;">${esc(i.message).replace(/\n/g, '<br>')}</p>
    <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;max-width:520px;background:${CREAM};border:1px solid ${LINE};border-radius:12px;">
      <tr><td style="padding:16px 20px;">
        <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;">${summary}${bank}
        </table>
      </td></tr>
    </table>
    ${button}
    ${cardNote}
    <p style="margin:18px 0 0;color:${MUTED};font-size:12px;">A copy of invoice ${esc(i.invoiceNumber)} is attached as a PDF.</p>
    <p style="margin:22px 0 0;">Kind regards,<br>The Sano team</p>
    <p style="margin:18px 0 0;color:#888888;font-size:12px;">Sano Property Services Limited</p>
  </div>`
}
