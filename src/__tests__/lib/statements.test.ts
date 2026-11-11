// Customer statements: month-based numbers (no running count from 0001), how
// customers write the reference at their bank, the email, and auto-reconcile
// splitting one STM payment across the statement's invoices.

import {
  buildStatementEmail,
  nextStatementNumber,
  referencedStatements,
  renderStatementEmailHtml,
  statementLineTitle,
  statementNumberPrefix,
  statementTotal,
} from '@/lib/statements'
import { proposeAutoReconcile, type ArCredit, type ArInvoice } from '@/lib/auto-reconcile'

describe('statement numbers', () => {
  it('are by month: STM-YYMMNN', () => {
    expect(statementNumberPrefix('2026-11-11')).toBe('STM-2611')
    expect(nextStatementNumber('2026-11-11', [])).toBe('STM-261101')
    expect(nextStatementNumber('2026-11-11', ['STM-261101', 'STM-261103', 'STM-261012'])).toBe('STM-261104')
  })

  it('fit a 12-character NZ bank reference', () => {
    expect(nextStatementNumber('2026-11-11', []).length).toBeLessThanOrEqual(12)
  })
})

describe('referencedStatements', () => {
  it.each([
    ['STM-261101', ['STM-261101']],
    ['stm 261101 bella', ['STM-261101']],
    ['STM261101', ['STM-261101']],
    ['INV-0547', []],
  ])('%s', (text, expected) => {
    expect(referencedStatements(text)).toEqual(expected)
  })
})

describe('statement lines + email', () => {
  it('titles a line by the first line of its description', () => {
    expect(statementLineTitle('Cleaning Services — Week of 19–25 October 2026\n1 scheduled visit', 'x')).toBe('Cleaning Services — Week of 19–25 October 2026')
    expect(statementLineTitle(null, 'Cleaning services')).toBe('Cleaning services')
  })

  it('totals balances to the cent', () => {
    expect(statementTotal([{ balance: 180 }, { balance: 180 }, { balance: 180.1 }])).toBe(540.1)
  })

  it('wording: pay-by-reference, or collected when on automatic payments', () => {
    const a = buildStatementEmail({ greeting: 'Hi Bella,', total: 540, count: 3, autopayActive: false })
    expect(a.subject).toBe('Your Sano statement: $540.00 outstanding')
    expect(a.message).toContain('the 3 invoices currently outstanding')
    expect(a.message).toContain('statement number shown below as the reference')
    const b = buildStatementEmail({ greeting: 'Hi Bella,', total: 180, count: 1, autopayActive: true })
    expect(b.message).toContain('collected from your nominated account by direct debit')
  })

  it('HTML: invoice links, STM reference, autopay invite only when asked', () => {
    const base = {
      message: 'Hi', statementNumber: 'STM-261101', total: 360, statementUrl: 'https://sano.nz/share/statement/t',
      bankAccountName: 'Sano Property Services Limited', bankAccountNumber: '12-3627-0005597-00', autopayActive: false,
      lines: [
        { invoiceNumber: 'INV-0547', title: 'Week of 19–25 October', dueDate: '2026-11-09', balance: 180, shareUrl: 'https://sano.nz/share/invoice/a' },
        { invoiceNumber: 'INV-0566', title: 'Week of 26 October', dueDate: null, balance: 180, shareUrl: 'https://sano.nz/share/invoice/b' },
      ],
    }
    const html = renderStatementEmailHtml(base)
    expect(html).toContain('https://sano.nz/share/invoice/a')
    expect(html).toContain('STM-261101')
    expect(html).toContain('$360.00')
    expect(html).not.toContain('Set up automatic payments')
    expect(renderStatementEmailHtml({ ...base, autopayUrl: 'https://sano.nz/api/autopay/x' })).toContain('Set up automatic payments')
    // On automatic payments: no bank details, no invite.
    const active = renderStatementEmailHtml({ ...base, autopayActive: true, autopayUrl: 'https://sano.nz/api/autopay/x' })
    expect(active).not.toContain('12-3627-0005597-00')
    expect(active).not.toContain('Set up automatic payments')
  })

  it('escapes the message', () => {
    expect(renderStatementEmailHtml({
      message: '<b>x</b>', statementNumber: 'STM-261101', total: 0, statementUrl: 'u', bankAccountName: 'a',
      bankAccountNumber: 'n', autopayActive: false, lines: [],
    })).toContain('&lt;b&gt;x&lt;/b&gt;')
  })
})

describe('auto-reconcile — statement reference', () => {
  const credit = (p: Partial<ArCredit>): ArCredit => ({ id: 'c1', date: '2026-11-20', amount: 540, payee: 'D/C FROM B MASUTTI', memo: 'STM-261101', cleared: false, allocated: 0, ...p })
  const inv = (n: string, p: Partial<ArInvoice> = {}): ArInvoice => ({
    id: n, number: n, status: 'sent', total: 180, allocated: 0, dateIssued: '2026-11-11', datePaid: null,
    clientId: 'bella', clientLabel: 'Bella Masutti', ...p,
  })
  const statements = [{ number: 'STM-261101', invoiceIds: ['INV-0547', 'INV-0566', 'INV-0585'] }]
  const invoices = [inv('INV-0547'), inv('INV-0566'), inv('INV-0585'), inv('INV-0600')]

  it('splits one payment across the statement invoices', () => {
    const r = proposeAutoReconcile({ credits: [credit({})], invoices, history: [], statements })
    expect(r.proposals).toHaveLength(1)
    expect(r.proposals[0].allocations.map((a) => a.invoiceId).sort()).toEqual(['INV-0547', 'INV-0566', 'INV-0585'])
    expect(r.proposals[0].allocations.every((a) => a.amount === 180)).toBe(true)
    expect(r.proposals[0].reason).toMatch(/^auto: statement STM-261101/)
  })

  it('does not force a match when the amount differs (part payment)', () => {
    const r = proposeAutoReconcile({ credits: [credit({ amount: 360 })], invoices, history: [], statements })
    expect(r.proposals).toHaveLength(0)
    expect(r.review).toHaveLength(1)
  })

  it('only counts invoices still open: one paid separately leaves the rest', () => {
    const paidOne = [inv('INV-0547', { allocated: 180 }), inv('INV-0566'), inv('INV-0585')]
    const r = proposeAutoReconcile({ credits: [credit({ amount: 360 })], invoices: paidOne, history: [], statements })
    expect(r.proposals).toHaveLength(1)
    expect(r.proposals[0].allocations.map((a) => a.invoiceId).sort()).toEqual(['INV-0566', 'INV-0585'])
  })

  it('ignores invoices already paid by card (their money comes in the Stripe payout)', () => {
    const cardPaid = [inv('INV-0547', { status: 'paid', paidViaStripe: true, datePaid: '2026-11-18' }), inv('INV-0566'), inv('INV-0585')]
    const r = proposeAutoReconcile({ credits: [credit({ amount: 540 })], invoices: cardPaid, history: [], statements })
    expect(r.proposals.some((p) => p.allocations.some((a) => a.invoiceId === 'INV-0547'))).toBe(false)
  })

  it('an unknown statement number changes nothing', () => {
    const r = proposeAutoReconcile({ credits: [credit({ memo: 'STM-269999' })], invoices, history: [], statements })
    expect(r.proposals).toHaveLength(0)
  })
})
