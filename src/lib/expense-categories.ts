// Working expense categories for the portal (Expenses V1).
//
// These are stored as plain text on `expenses.category`; this constant is
// the single source of truth for the UI dropdown so we don't get duplicate
// spellings. The accountant will confirm the final category structure —
// these are working categories only, with NO tax treatment implied.
//
// `accountantConfirm` marks categories that are NOT ordinary deductible
// expenses (capital expense = an asset, likely depreciated; owner
// loan/contribution/drawings = equity/loan). They are available for
// capture, but the UI flags them so they aren't treated as expenses.

export interface ExpenseCategory {
  value: string
  label: string
  accountantConfirm?: boolean
}

export const EXPENSE_CATEGORIES: readonly ExpenseCategory[] = [
  { value: 'insurance', label: 'Insurance' },
  { value: 'cpax', label: 'CPAX' },
  { value: 'software_subscriptions', label: 'Software / subscriptions' },
  { value: 'telecommunications', label: 'Telecommunications' },
  { value: 'bank_fees', label: 'Bank fees' },
  { value: 'fuel_travel', label: 'Fuel / travel' },
  { value: 'materials_supplies', label: 'Materials / supplies' },
  { value: 'rubbish_removal', label: 'Rubbish removal / disposal' },
  { value: 'equipment', label: 'Equipment' },
  { value: 'marketing', label: 'Marketing' },
  { value: 'accounting_legal', label: 'Accounting / legal' },
  { value: 'wages_payroll', label: 'Wages / payroll' },
  { value: 'capital_expense', label: 'Capital expense', accountantConfirm: true },
  { value: 'owner_equity', label: 'Owner loan / contribution / drawings', accountantConfirm: true },
  { value: 'other', label: 'Other' },
]

export const EXPENSE_CATEGORY_VALUES: readonly string[] = EXPENSE_CATEGORIES.map((c) => c.value)

/** Normalise an incoming category to a known value, falling back to 'other'. */
export function normaliseExpenseCategory(value: string | null | undefined): string {
  return value && EXPENSE_CATEGORY_VALUES.includes(value) ? value : 'other'
}

/** Human label for a stored category value. */
export function expenseCategoryLabel(value: string | null | undefined): string {
  return EXPENSE_CATEGORIES.find((c) => c.value === value)?.label ?? (value || 'Other')
}

/** Whether a category needs accountant confirmation (capex / owner equity). */
export function isAccountantConfirmCategory(value: string | null | undefined): boolean {
  return !!EXPENSE_CATEGORIES.find((c) => c.value === value)?.accountantConfirm
}
