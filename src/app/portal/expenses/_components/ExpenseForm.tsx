'use client'

import { useState, useTransition } from 'react'
import { ChevronDown, Trash2 } from 'lucide-react'
import { createExpense, updateExpense, deleteExpense } from '../_actions'
import { EXPENSE_CATEGORIES, isAccountantConfirmCategory } from '@/lib/expense-categories'
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
}

export function ExpenseForm({ expense, vendorSuggestions = [] }: { expense?: ExpenseData; vendorSuggestions?: VendorSuggestion[] }) {
  const isEdit = !!expense?.id

  const [expenseDate, setExpenseDate] = useState(expense?.expense_date ?? new Date().toISOString().slice(0, 10))
  const [amount, setAmount] = useState(expense?.amount ? String(expense.amount) : '')
  const [category, setCategory] = useState(expense?.category ?? 'other')
  const [vendor, setVendor] = useState(expense?.vendor ?? '')
  const [description, setDescription] = useState(expense?.description ?? '')
  const [paymentReference, setPaymentReference] = useState(expense?.payment_reference ?? '')
  const [gstInclusive, setGstInclusive] = useState(expense?.gst_inclusive ?? true)
  const [notes, setNotes] = useState(expense?.notes ?? '')
  // Once the user picks a category by hand, stop auto-prefilling it from the
  // vendor so we never clobber a deliberate choice.
  const [categoryTouched, setCategoryTouched] = useState(false)

  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const accountantConfirm = isAccountantConfirmCategory(category)

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
      const result = isEdit
        ? await updateExpense(expense!.id!, payload)
        : await createExpense(payload)
      if (result && 'error' in result && result.error) { setError(result.error); return }
      if (isEdit) window.location.href = '/portal/expenses'
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
                {EXPENSE_CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
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
