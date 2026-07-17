// Expense receipts — shared constants + validators (client + server safe).
//
// A receipt (image or PDF) can be attached to an expense. Files live in the
// private `expense-receipts` bucket and are only ever served via short-lived
// signed URLs, brokered by the service-role client — same pattern as job-photos
// and worker-documents. The signed-URL helper is server-only; see
// getExpenseReceiptUrl in src/app/portal/expenses/_data.ts.

export const EXPENSE_RECEIPTS_BUCKET = 'expense-receipts'
export const RECEIPT_MAX_BYTES = 10 * 1024 * 1024 // 10 MB
/** File input accept attribute — images + PDF (invoices are often PDF). */
export const RECEIPT_ACCEPT = 'image/*,application/pdf'

export function isAllowedReceiptType(type: string): boolean {
  return type.startsWith('image/') || type === 'application/pdf'
}

/** Is this stored path / mime type a PDF (vs an image we can thumbnail)? */
export function receiptIsPdf(pathOrType: string | null | undefined): boolean {
  if (!pathOrType) return false
  const v = pathOrType.toLowerCase()
  return v.endsWith('.pdf') || v === 'application/pdf'
}

/** File extension (lowercased, alphanumeric) for a stored path, defaulting to jpg. */
export function receiptExt(fileName: string): string {
  const parts = fileName.split('.')
  const raw = parts.length > 1 ? (parts.pop() ?? '') : '' // no dot → no extension
  return raw.toLowerCase().replace(/[^a-z0-9]/g, '') || 'jpg'
}
