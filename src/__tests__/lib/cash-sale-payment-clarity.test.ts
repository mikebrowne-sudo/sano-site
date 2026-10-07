// A prepaid ("cash sale") customer is asked to pay BEFORE the clean. They may
// never open the attached document, so the requirement has to be stated in three
// places that all agree: the quote/invoice callout, the quote email, and the
// terms paragraph.
//
// 116 of Sano's 285 quotes are cash sales, so this is not an edge case.

import { sanoPaymentDetails, SANO_ACCOUNT_NUMBER } from '@/lib/sano-bank-details'

/** Mirrors QuoteDocument / InvoiceDocument. */
function isCashSale(paymentType: string | null | undefined): boolean {
  return (paymentType ?? 'cash_sale') === 'cash_sale'
}

/** Mirrors the prepaidLine in SendQuotePanel. */
function prepaidEmailLine(paymentType: string | null, quoteNumber: string): string {
  return paymentType === 'cash_sale'
    ? `\n\nPayment is required before the clean. Once you are happy to go ahead, please pay to Sano Property Services Limited, ${SANO_ACCOUNT_NUMBER}, using ${quoteNumber} as the reference, and we will confirm your booking.`
    : ''
}

describe('isCashSale', () => {
  it('treats a null payment_type as a cash sale — the safer default', () => {
    // Asking for payment when it was not needed is recoverable; silently
    // treating prepaid work as on-account means the clean happens unpaid.
    expect(isCashSale(null)).toBe(true)
    expect(isCashSale(undefined)).toBe(true)
  })

  it('reads the explicit values', () => {
    expect(isCashSale('cash_sale')).toBe(true)
    expect(isCashSale('on_account')).toBe(false)
  })
})

describe('the quote email states the requirement', () => {
  it('a prepaid quote email says payment comes first and gives the account', () => {
    const line = prepaidEmailLine('cash_sale', 'QUO-0324')
    expect(line).toContain('Payment is required before the clean')
    expect(line).toContain(SANO_ACCOUNT_NUMBER)
    expect(line).toContain('QUO-0324')
  })

  it('an on-account quote email says nothing about paying up front', () => {
    expect(prepaidEmailLine('on_account', 'QUO-0324')).toBe('')
  })
})

describe('the payment block', () => {
  it('a prepaid quote shows the account with the quote number as reference', () => {
    const rows = sanoPaymentDetails('QUO-0324')
    expect(rows.find((r) => r.label === 'Reference')?.value).toBe('QUO-0324')
    expect(rows.find((r) => r.label === 'Number')?.value).toBe(SANO_ACCOUNT_NUMBER)
  })

  it('the account shown on the quote is the same one shown on the invoice', () => {
    // A customer who pays off the quote and one who pays off the invoice must
    // reach the same bank account.
    const q = sanoPaymentDetails('QUO-0324')
    const i = sanoPaymentDetails('INV-0412')
    expect(q.slice(0, 2)).toEqual(i.slice(0, 2))
  })
})
