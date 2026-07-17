import { isAllowedReceiptType, receiptIsPdf, receiptExt, RECEIPT_MAX_BYTES } from '@/lib/expense-receipts'

describe('expense-receipts helpers', () => {
  it('allows images and PDFs only', () => {
    expect(isAllowedReceiptType('image/jpeg')).toBe(true)
    expect(isAllowedReceiptType('image/png')).toBe(true)
    expect(isAllowedReceiptType('image/heic')).toBe(true)
    expect(isAllowedReceiptType('application/pdf')).toBe(true)
    expect(isAllowedReceiptType('text/plain')).toBe(false)
    expect(isAllowedReceiptType('application/zip')).toBe(false)
  })

  it('detects PDFs from a path or mime type', () => {
    expect(receiptIsPdf('abc/def.pdf')).toBe(true)
    expect(receiptIsPdf('abc/DEF.PDF')).toBe(true)
    expect(receiptIsPdf('application/pdf')).toBe(true)
    expect(receiptIsPdf('abc/photo.jpg')).toBe(false)
    expect(receiptIsPdf(null)).toBe(false)
  })

  it('derives a safe file extension', () => {
    expect(receiptExt('receipt.PDF')).toBe('pdf')
    expect(receiptExt('scan.jpeg')).toBe('jpeg')
    expect(receiptExt('noext')).toBe('jpg')
    expect(receiptExt('weird.name.PnG')).toBe('png')
  })

  it('caps receipts at 10 MB', () => {
    expect(RECEIPT_MAX_BYTES).toBe(10 * 1024 * 1024)
  })
})
