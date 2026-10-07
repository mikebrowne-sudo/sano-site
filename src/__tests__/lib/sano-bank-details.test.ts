import {
  SANO_ACCOUNT_NAME,
  SANO_ACCOUNT_NUMBER,
  sanoPaymentDetails,
} from '@/lib/sano-bank-details'

describe('sanoPaymentDetails', () => {
  it('returns account, number and the supplied reference in order', () => {
    expect(sanoPaymentDetails('QT-0123')).toEqual([
      { label: 'Account', value: SANO_ACCOUNT_NAME },
      { label: 'Number', value: SANO_ACCOUNT_NUMBER },
      { label: 'Reference', value: 'QT-0123' },
    ])
  })

  it('uses the document number it is given — a quote and an invoice differ only there', () => {
    const quote = sanoPaymentDetails('QT-0123')
    const invoice = sanoPaymentDetails('INV-0456')

    // The account must be identical across both documents.
    expect(quote.slice(0, 2)).toEqual(invoice.slice(0, 2))
    expect(quote[2]).toEqual({ label: 'Reference', value: 'QT-0123' })
    expect(invoice[2]).toEqual({ label: 'Reference', value: 'INV-0456' })
  })

  it('exposes the live Sano receiving account', () => {
    // Guards against a silent edit to the account customers pay into.
    expect(SANO_ACCOUNT_NAME).toBe('Sano Property Services Limited')
    expect(SANO_ACCOUNT_NUMBER).toBe('12-3627-0005597-00')
  })
})
