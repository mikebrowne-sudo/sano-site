'use client'

import { useEffect, useState, useTransition } from 'react'
import { ChevronDown, Trash2, UploadCloud, FileText, X } from 'lucide-react'
import { createExpense, updateExpense, deleteExpense } from '../_actions'
import { uploadExpenseReceipt, removeExpenseReceipt } from '../_actions-receipt'
import { SELECTABLE_EXPENSE_CATEGORIES, isAccountantConfirmCategory } from '@/lib/expense-categories'
import { RECEIPT_ACCEPT, RECEIPT_MAX_BYTES, isAllowedReceiptType, receiptIsPdf } from '@/lib/expense-receipts'
import type { VendorSuggestion } from '../_data'

export interface ExpenseData {
  id?: string
  expense_date: string
  amount: number
  category: string
  vendor: string | null
  description: string | null
  payment_reference: string | null
  gst_inclusive: boolean
  notes: string | null
  receipt_path?: string | null
}

export function ExpenseForm({
  expense,
  vendorSuggestions = [],
  receiptUrl = null,
  returnTo = '/portal/expenses',
}: {
  expense?: ExpenseData
  vendorSuggestions?: VendorSuggestion[]
  receiptUrl?: string | null
  /** Where to go after saving — the origin the user came from (e.g. reconcile). */
  returnTo?: string
}) {
  const isEdit = !!expense?.id

  const [expenseDate, setExpenseDate] = useState(expense?.expense_date ?? new Date().toISOString().slice(0, 10))
  const [amount, setAmount] = useState(expense?.amount ? String(expense.amount) : '')
  const [category, setCategory] = useState(expense?.category ?? 'other')
  const [vendor, setVendor] = useState(expense?.vendor ?? '')
  const [description, setDescription] = useState(expense?.description ?? '')
  const [paymentReference, setPaymentReference] = useState(expense?.payment_reference ?? '')
  const [gstInclusive, setGstInclusive] = useState(expense?.gst_inclusive ?? true)
  const [notes, setNotes] = useState(expense?.notes ?? '')
  const [categoryTouched, setCategoryTouched] = useState(false)

  // Receipt state: a newly-staged file, or a flag to drop the existing one.
  const [receiptFile, setReceiptFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [removeExisting, setRemoveExisting] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const [receiptError, setReceiptError] = useState<string | null>(null)

  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const accountantConfirm = isAccountantConfirmCategory(category)
  const hasExistingReceipt = isEdit && !!expense?.receipt_path && !!receiptUrl && !removeExisting && !receiptFile

  // Object URL for image previews of a staged file; revoked on change/unmount.
  useEffect(() => {
    if (receiptFile && receiptFile.type.startsWith('image/')) {
      const url = URL.createObjectURL(receiptFile)
      setPreviewUrl(url)
      return () => URL.revokeObjectURL(url)
    }
    setPreviewUrl(null)
  }, [receiptFile])

  function stageFile(f: File) {
    if (!isAllowedReceiptType(f.type)) { setReceiptError('Receipts must be an image or a PDF.'); return }
    if (f.size > RECEIPT_MAX_BYTES) { setReceiptError('The receipt must be under 10 MB.'); return }
    setReceiptError(null)
    setReceiptFile(f)
    setRemoveExisting(false)
  }

  function handleVendorChange(v: string) {
    setVendor(v)
    const match = vendorSuggestions.find((s) => s.vendor.toLowerCase() === v.trim().toLowerCase())
    if (match && !categoryTouched) {
      setCategory(match.category)
      setGstInclusive(match.gst_inclusive)
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    const amt = parseFloat(amount)
    if (!expenseDate) { setError('Date is required.'); return }
    if (!amt || amt <= 0) { setError('Amount must be greater than zero.'); return }

    const payload = {
      expense_date: expenseDate,
      amount: amt,
      category,
      vendor: vendor.trim() || null,
      description: description.trim() || null,
      payment_reference: paymentReference.trim() || null,
      gst_inclusive: gstInclusive,
      notes: notes.trim() || null,
    }

    startTransition(async () => {
      let expenseId = expense?.id
      if (isEdit) {
        const result = await updateExpense(expense!.id!, payload)
        if (result && 'error' in result && result.error) { setError(result.error); return }
      } else {
        const result = await createExpense(payload)
        if (result && 'error' in result && result.error) { setError(result.error); return }
        expenseId = result && 'id' in result ? result.id : undefined
      }

      // Attach / replace / remove the receipt once the expense exists.
      if (expenseId) {
        if (receiptFile) {
          const fd = new FormData()
          fd.append('receipt', receiptFile)
          const up = await uploadExpenseReceipt(expenseId, fd)
          if (up && 'error' in up && up.error) { setError(`Expense saved, but the receipt didn't upload: ${up.error}`); return }
        } else if (isEdit && removeExisting && expense?.receipt_path) {
          await removeExpenseReceipt(expenseId)
        }
      }

      window.location.href = returnTo
    })
  }

  function handleDelete() {
    if (!isEdit) return
    if (!confirm('Delete this expense? This cannot be undone.')) return
    setError(null)
    startTransition(async () => {
      const result = await deleteExpense(expense!.id!)
      if (result && 'error' in result && result.error) setError(result.error)
    })
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-2xl space-y-8">
      <Section title="Expense">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <label className="block">
            <span className="block text-sm font-semibold text-sage-800 mb-1.5">Date <span className="text-red-500">*</span></span>
            <input type="date" value={expenseDate} onChange={(e) => setExpenseDate(e.target.value)} required className={inputCls} />
          </label>
          <label className="block">
            <span className="block text-sm font-semibold text-sage-800 mb-1.5">Amount ($) <span className="text-red-500">*</span></span>
            <input type="number" step="0.01" min="0" value={amount} onChange={(e) => setAmount(e.target.value)} required className={inputCls} />
          </label>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
          <label className="block">
            <span className="block text-sm font-semibold text-sage-800 mb-1.5">Category <span className="text-red-500">*</span></span>
            <div className="relative">
              <select value={category} onChange={(e) => { setCategory(e.target.value); setCategoryTouched(true) }} className={`${inputCls} appearance-none pr-10 bg-white`}>
                {SELECTABLE_EXPENSE_CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
              <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-sage-400 pointer-events-none" />
            </div>
            {accountantConfirm && (
              <span className="block text-xs text-amber-700 mt-1">Not an ordinary expense — confirm treatment with your accountant. Captured for reference only.</span>
            )}
          </label>
          <label className="block">
            <span className="block text-sm font-semibold text-sage-800 mb-1.5">Vendor / supplier</span>
            <input value={vendor} onChange={(e) => handleVendorChange(e.target.value)} list="expense-vendor-list" placeholder="e.g. NZI, Xero, Z Energy" className={inputCls} />
            <datalist id="expense-vendor-list">
              {vendorSuggestions.map((s) => <option key={s.vendor} value={s.vendor} />)}
            </datalist>
            {vendorSuggestions.length > 0 && !isEdit && (
              <span className="block text-xs text-sage-500 mt-1">Pick a saved supplier to prefill its usual category &amp; GST.</span>
            )}
          </label>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
          <label className="block">
            <span className="block text-sm font-semibold text-sage-800 mb-1.5">Payment reference</span>
            <input value={paymentReference} onChange={(e) => setPaymentReference(e.target.value)} placeholder="Bank reference, for matching" className={inputCls} />
          </label>
          <label className="flex items-center gap-2 mt-7">
            <input type="checkbox" checked={gstInclusive} onChange={(e) => setGstInclusive(e.target.checked)} className="h-4 w-4 rounded border-sage-300 text-sage-500 focus:ring-sage-500" />
            <span className="text-sm text-sage-700">Amount is GST-inclusive</span>
          </label>
        </div>

        <label className="block mt-4">
          <span className="block text-sm font-semibold text-sage-800 mb-1.5">Description</span>
          <input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What was it for?" className={inputCls} />
        </label>
      </Section>

      <Section title="Receipt / invoice">
        {hasExistingReceipt ? (
          <div className="flex items-center gap-4 rounded-xl border border-sage-200 p-3">
            {receiptIsPdf(expense?.receipt_path) ? (
              <a href={receiptUrl!} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sage-700 hover:text-sage-900">
                <FileText size={28} className="text-sage-400" /> <span className="text-sm font-medium underline">View receipt (PDF)</span>
              </a>
            ) : (
              <a href={receiptUrl!} target="_blank" rel="noopener noreferrer">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={receiptUrl!} alt="Receipt" className="h-20 w-20 rounded-lg object-cover border border-sage-100" />
              </a>
            )}
            <button type="button" onClick={() => setRemoveExisting(true)} className="ml-auto inline-flex items-center gap-1.5 text-sm text-red-600 hover:text-red-700">
              <X size={14} /> Remove
            </button>
          </div>
        ) : receiptFile ? (
          <div className="flex items-center gap-4 rounded-xl border border-sage-200 p-3">
            {previewUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={previewUrl} alt="Receipt preview" className="h-20 w-20 rounded-lg object-cover border border-sage-100" />
            ) : (
              <FileText size={28} className="text-sage-400" />
            )}
            <div className="min-w-0">
              <div className="text-sm font-medium text-sage-800 truncate">{receiptFile.name}</div>
              <div className="text-xs text-sage-500">{(receiptFile.size / 1024 / 1024).toFixed(1)} MB · ready to upload on save</div>
            </div>
            <button type="button" onClick={() => { setReceiptFile(null); setReceiptError(null) }} className="ml-auto inline-flex items-center gap-1.5 text-sm text-red-600 hover:text-red-700">
              <X size={14} /> Remove
            </button>
          </div>
        ) : (
          <label
            onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files?.[0]; if (f) stageFile(f) }}
            className={`flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-6 py-8 text-center cursor-pointer transition-colors ${dragOver ? 'border-sage-500 bg-sage-50' : 'border-sage-200 hover:border-sage-300 hover:bg-sage-50/50'}`}
          >
            <UploadCloud size={28} className="text-sage-400" />
            <span className="text-sm text-sage-700"><span className="font-semibold text-sage-800">Drag &amp; drop</span> a receipt here, or <span className="text-sage-700 underline">browse</span></span>
            <span className="text-xs text-sage-400">Image or PDF, up to 10 MB</span>
            <input type="file" accept={RECEIPT_ACCEPT} className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) stageFile(f) }} />
          </label>
        )}
        {removeExisting && !receiptFile && (
          <p className="text-xs text-amber-700 mt-2">Existing receipt will be removed when you save. <button type="button" onClick={() => setRemoveExisting(false)} className="underline">Undo</button></p>
        )}
        {receiptError && <p className="text-red-600 text-sm mt-2">{receiptError}</p>}
      </Section>

      <Section title="Notes">
        <textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional notes…" className={`${inputCls} resize-y`} />
      </Section>

      {error && <p className="text-red-600 text-sm bg-red-50 rounded-lg px-4 py-3">{error}</p>}

      <div className="flex items-center gap-4">
        <button type="submit" disabled={isPending} className="bg-sage-500 text-white font-semibold px-6 py-3 rounded-lg hover:bg-sage-700 transition-colors disabled:opacity-50">
          {isPending ? 'Saving…' : isEdit ? 'Save changes' : 'Add expense'}
        </button>
        <a href="/portal/expenses" className="text-sm text-sage-600 hover:text-sage-800">Cancel</a>
        {isEdit && (
          <button type="button" onClick={handleDelete} disabled={isPending} className="ml-auto inline-flex items-center gap-1.5 text-sm text-red-600 hover:text-red-700 disabled:opacity-50">
            <Trash2 size={14} /> Delete
          </button>
        )}
      </div>
    </form>
  )
}

const inputCls = 'w-full rounded-lg border border-sage-200 px-4 py-3 text-sage-800 placeholder:text-sage-300 text-sm focus:outline-none focus:ring-2 focus:ring-sage-500'

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return <fieldset><legend className="text-lg font-semibold text-sage-800 mb-4">{title}</legend>{children}</fieldset>
}
