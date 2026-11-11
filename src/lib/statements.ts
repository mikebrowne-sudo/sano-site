// Customer statements: one email listing every outstanding invoice for a
// client, each invoice's PDF attached, one bank reference for paying them all.
//
// A statement is NOT a tax invoice. Each invoice stays its own document with
// its own number, GST and due date; the statement only groups them. Payments
// are still recorded against each invoice (allocations), so GST, the
// accountant pack and the P&L see exactly what they did before.
//
// Numbering is by month, STM-YYMMNN (STM-261101 = first statement of
// November 2026): no running count from 0001, and 10 characters fits the
// 12-character NZ bank reference field.

const SAGE = '#076653'
const INK = '#06231D'
const MUTED = '#5C6B64'
const LINE = '#E0EAE3'
const CREAM = '#FAF9F6'

export function fmtMoney(n: number): string {
  return new Intl.NumberFormat('en-NZ', { style: 'currency', currency: 'NZD' }).format(n)
}

/** "2026-11-23" → "23 November 2026" (date-only, no timezone shift). */
export function fmtLongDate(iso: string): string {
  const [y, m, d] = iso.slice(0, 10).split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString('en-NZ', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' })
}

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

// ── Numbering ────────────────────────────────────────────────────────────────

/** "STM-2611" for an NZ date in November 2026. */
export function statementNumberPrefix(nzDate: string): string {
  return `STM-${nzDate.slice(2, 4)}${nzDate.slice(5, 7)}`
}

/** The next free number this month, given the numbers already used. */
export function nextStatementNumber(nzDate: string, existing: string[]): string {
  const prefix = statementNumberPrefix(nzDate)
  let max = 0
  for (const n of existing) {
    if (!n.toUpperCase().startsWith(prefix)) continue
    const seq = Number(n.slice(prefix.length))
    if (Number.isFinite(seq) && seq > max) max = seq
  }
  return `${prefix}${String(max + 1).padStart(2, '0')}`
}

/** Statement numbers written in bank text ("STM-261101", "stm 261101", "STM261101"). */
export function referencedStatements(text: string): string[] {
  const out = new Set<string>()
  const re = /stm[-\s.#]*(\d{6})\b/gi
  let m: RegExpExecArray | null
  while ((m = re.exec(text)) !== null) out.add(`STM-${m[1]}`)
  return Array.from(out)
}

// ── Lines ────────────────────────────────────────────────────────────────────

export interface StatementLine {
  invoiceId: string
  invoiceNumber: string
  status: string
  /** First line of the invoice's service description ("Cleaning Services — Week of 19–25 October 2026"). */
  title: string
  dateIssued: string | null
  dueDate: string | null
  /** GST-inclusive invoice total. */
  total: number
  paid: number
  /** What is still owed. */
  balance: number
  shareToken: string
}

/** Short title for an invoice on a statement: the first line of its description. */
export function statementLineTitle(serviceDescription: string | null | undefined, fallback: string): string {
  const first = (serviceDescription ?? '').split('\n').map((s) => s.trim()).find(Boolean)
  return first || fallback
}

export function statementTotal(lines: Pick<StatementLine, 'balance'>[]): number {
  return Math.round(lines.reduce((s, l) => s + l.balance, 0) * 100) / 100
}

// ── Email ────────────────────────────────────────────────────────────────────

export function buildStatementEmail(i: {
  greeting: string
  total: number
  count: number
  /** Customer already pays by direct debit: say it'll be collected, don't ask them to pay. */
  autopayActive: boolean
}): { subject: string; message: string } {
  const total = fmtMoney(i.total)
  const what = i.count === 1 ? 'the invoice' : `the ${i.count} invoices`
  const how = i.autopayActive
    ? 'These will be collected from your nominated account by direct debit, so there is nothing you need to do.'
    : 'You can pay them all in one payment using the statement number shown below as the reference, or pay each invoice separately using its own number.'
  return {
    subject: `Your Sano statement: ${total} outstanding`,
    message:
      `${i.greeting}\n\nPlease find your statement below, showing ${what} currently outstanding on your account, totalling ${total}. ` +
      `A copy of each invoice is attached.\n\n${how}\n\nIf you have any questions, just reply to this email.`,
  }
}

export function renderStatementEmailHtml(i: {
  message: string
  statementNumber: string
  lines: Array<Pick<StatementLine, 'invoiceNumber' | 'title' | 'dueDate' | 'balance'> & { shareUrl: string }>
  total: number
  statementUrl: string
  bankAccountName: string
  bankAccountNumber: string
  /** Pay-all-by-card link (Stripe), when card payment is offered. */
  payUrl?: string | null
  /** Automatic payments setup link, when staff ticked "include". */
  autopayUrl?: string | null
  autopayActive: boolean
}): string {
  const row = (label: string, value: string, strong = false) => `
        <tr>
          <td style="padding:7px 0;color:${MUTED};font-size:14px;">${esc(label)}</td>
          <td style="padding:7px 0;color:${INK};font-size:14px;text-align:right;${strong ? 'font-weight:700;' : 'font-weight:600;'}">${esc(value)}</td>
        </tr>`
  const section = (title: string) => `
        <tr><td colspan="2" style="padding:14px 0 4px;border-top:1px solid ${LINE};color:${SAGE};font-size:11px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;">${esc(title)}</td></tr>`
  const button = (href: string, label: string, solid: boolean) => `
    <a href="${esc(href)}" style="display:inline-block;margin:0 8px 8px 0;padding:11px 20px;border-radius:8px;font-weight:600;font-size:14px;text-decoration:none;${solid ? `background:${SAGE};color:#ffffff;` : `background:#ffffff;color:${SAGE};border:1px solid ${SAGE};`}">${esc(label)}</a>`

  const lines = i.lines.map((x) => `
        <tr>
          <td style="padding:8px 0;font-size:14px;border-bottom:1px solid ${LINE};">
            <a href="${esc(x.shareUrl)}" style="color:${SAGE};font-weight:600;text-decoration:none;">${esc(x.invoiceNumber)}</a>
            <br><span style="color:${MUTED};font-size:12px;">${esc(x.title)}${x.dueDate ? ` · Due ${esc(fmtLongDate(x.dueDate))}` : ''}</span>
          </td>
          <td style="padding:8px 0;color:${INK};font-size:14px;font-weight:600;text-align:right;border-bottom:1px solid ${LINE};vertical-align:top;">${esc(fmtMoney(x.balance))}</td>
        </tr>`).join('')

  const pay = i.autopayActive
    ? `${section('Payment')}
        <tr><td colspan="2" style="padding:7px 0;color:${INK};font-size:14px;">Collected automatically by direct debit.</td></tr>`
    : [
        section('Pay by bank transfer'),
        row('Account name', i.bankAccountName),
        row('Account number', i.bankAccountNumber),
        row('Reference', i.statementNumber),
      ].join('')

  const buttons = [
    !i.autopayActive && i.payUrl ? button(i.payUrl, 'Pay online by card', true) : '',
    button(i.statementUrl, 'View statement', !(!i.autopayActive && i.payUrl)),
  ].join('')
  const cardNote = !i.autopayActive && i.payUrl
    ? `<p style="margin:4px 0 0;color:${MUTED};font-size:12px;">Paying by card adds a 2.5% card fee. Bank transfer has no fee.</p>`
    : ''

  const autopay = i.autopayUrl && !i.autopayActive
    ? `
    <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;max-width:520px;margin-top:18px;border:1px solid ${LINE};border-radius:12px;">
      <tr><td style="padding:16px 20px;">
        <p style="margin:0 0 4px;color:${SAGE};font-size:11px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;">Automatic payments</p>
        <p style="margin:0 0 12px;color:${INK};font-size:14px;">Set up automatic payments and each invoice we send you is paid automatically, so there's nothing to remember. Choose a direct debit from your bank account (no fee) or a card (2.5% card fee is added to each payment). You enter your details yourself on Stripe's secure page, we'll still email you every invoice, and you can ask us to stop at any time.</p>
        ${button(i.autopayUrl, 'Set up automatic payments', false)}
      </td></tr>
    </table>`
    : ''

  return `
  <div style="font-family:Arial,Helvetica,sans-serif;color:${INK};font-size:15px;line-height:1.55;max-width:560px;">
    <p style="margin:0 0 18px;">${esc(i.message).replace(/\n/g, '<br>')}</p>
    <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;max-width:520px;background:${CREAM};border:1px solid ${LINE};border-radius:12px;">
      <tr><td style="padding:16px 20px;">
        <p style="margin:0 0 6px;color:${SAGE};font-size:11px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;">Statement ${esc(i.statementNumber)}</p>
        <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;">${lines}${row('Total outstanding', fmtMoney(i.total), true)}${pay}
        </table>
      </td></tr>
    </table>
    <div style="margin-top:16px;">${buttons}</div>
    ${cardNote}
    ${autopay}
    <p style="margin:16px 0 0;color:${MUTED};font-size:12px;">Tap an invoice number to view it. Copies of ${esc(i.lines.map((l) => l.invoiceNumber).join(', '))} and this statement are attached as PDFs.</p>
    <p style="margin:22px 0 0;">Kind regards,<br>The Sano team</p>
    <p style="margin:18px 0 0;color:#888888;font-size:12px;">Sano Property Services Limited</p>
  </div>`
}
