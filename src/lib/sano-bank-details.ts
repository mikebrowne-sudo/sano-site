// Sano's own bank account, as shown to CUSTOMERS on quotes and invoices.
//
// ONE definition so a quote and the invoice that follows it can never disagree
// about where the money goes. Previously the account lived inline in
// InvoiceDocument only, which is why quotes shipped without it.
//
// The reference differs per document (quote number vs invoice number) and is
// therefore passed in, never hardcoded here.
//
// NOTE: this is Sano's RECEIVING account. Contractor bank accounts — the money
// going out — are a different concern entirely, handled by src/lib/bank-account.ts.

export const SANO_ACCOUNT_NAME = 'Sano Property Services Limited'
export const SANO_ACCOUNT_NUMBER = '12-3627-0005597-00'

export interface PaymentDetailRow {
  label: string
  value: string
}

/**
 * The customer-facing payment block. `reference` is the document number the
 * customer should quote when paying (QT-#### or INV-####).
 */
export function sanoPaymentDetails(reference: string): PaymentDetailRow[] {
  return [
    { label: 'Account', value: SANO_ACCOUNT_NAME },
    { label: 'Number', value: SANO_ACCOUNT_NUMBER },
    { label: 'Reference', value: reference },
  ]
}
