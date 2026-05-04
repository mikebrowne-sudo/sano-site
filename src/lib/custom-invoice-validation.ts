export type CustomInvoicePaymentType = 'cash_sale' | 'on_account'

export interface CustomInvoiceFormInput {
  invoice_number: string
  client_id: string
  date_issued: string  // ISO yyyy-mm-dd
  due_date: string     // ISO yyyy-mm-dd
  service_address: string | null
  notes: string
  base_price: number
  gst_included: boolean
  payment_type: CustomInvoicePaymentType
}

export type ValidationResult =
  | { ok: true; value: CustomInvoiceFormInput }
  | { ok: false; errors: Partial<Record<keyof CustomInvoiceFormInput, string>> }

const INV_NUMBER_PATTERN = /^INV-\d{4,6}$/
const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/
const PAYMENT_TYPES: readonly string[] = ['cash_sale', 'on_account']

export function validateCustomInvoiceForm(raw: CustomInvoiceFormInput): ValidationResult {
  const errors: Partial<Record<keyof CustomInvoiceFormInput, string>> = {}

  const invNum = (raw.invoice_number ?? '').trim()
  if (!invNum) {
    errors.invoice_number = 'Invoice number is required.'
  } else if (!INV_NUMBER_PATTERN.test(invNum)) {
    errors.invoice_number = 'Invoice number format must be INV-XXXX (4–6 digits).'
  }

  if (!raw.client_id) {
    errors.client_id = 'Client is required.'
  }

  if (!ISO_DATE_PATTERN.test(raw.date_issued ?? '')) {
    errors.date_issued = 'Date issued must be a valid date (YYYY-MM-DD).'
  }
  if (!ISO_DATE_PATTERN.test(raw.due_date ?? '')) {
    errors.due_date = 'Due date must be a valid date (YYYY-MM-DD).'
  }
  if (!errors.date_issued && !errors.due_date && raw.due_date < raw.date_issued) {
    errors.due_date = 'Due date must be on or after the date issued.'
  }

  if (typeof raw.base_price !== 'number' || Number.isNaN(raw.base_price) || raw.base_price < 0) {
    errors.base_price = 'Base price must be zero or more.'
  }

  if (!(raw.notes ?? '').trim()) {
    errors.notes = 'Notes / description is required.'
  }

  if (!PAYMENT_TYPES.includes(raw.payment_type)) {
    errors.payment_type = 'Payment type must be cash_sale or on_account.'
  }

  if (Object.keys(errors).length > 0) {
    return { ok: false, errors }
  }
  return {
    ok: true,
    value: {
      ...raw,
      invoice_number: invNum,
      service_address: (raw.service_address ?? '').trim() || null,
      notes: raw.notes.trim(),
    },
  }
}
