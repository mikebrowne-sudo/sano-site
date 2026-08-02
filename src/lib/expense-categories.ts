// Working expense categories for the portal (Expenses V1).
//
// These are stored as plain text on `expenses.category`; this constant is
// the single source of truth for the UI dropdown so we don't get duplicate
// spellings. The accountant will confirm the final category structure —
// these are working categories only, with NO tax treatment implied.
//
// `accountantConfirm` marks categories that are NOT ordinary deductible
// expenses (capital expense = an asset, likely depreciated; owner
// capital / loans / reimbursements = equity / loan / balance-sheet). They are
// available for capture, but the UI flags them so they aren't treated as
// operating expenses or trading income, and the P&L keeps them below the line.
//
// The owner/equity area is split so the five distinct cash treatments are
// separable (previously all collapsed into `owner_equity`):
//   • owner_capital        — genuine capital introduced by the owner
//   • expense_reimbursement — owner repaying the business for a business cost
//                             the company initially paid (links to that expense)
//   • director_loan        — a director / shareholder loan (repayable)
//   • capital_expense      — an asset the business bought (e.g. a laptop)
// Trading income lives in `invoices`; tax-holding transfers are cash movements
// tracked outside the expenses table. `owner_equity` is retained as a legacy
// value so old rows still resolve, but it is no longer offered in the picker.

export interface ExpenseCategory {
  value: string
  label: string
  accountantConfirm?: boolean
  /** Legacy value kept for old rows; hidden from the capture dropdown. */
  legacy?: boolean
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
  { value: 'capital_expense', label: 'Capital expense (asset)', accountantConfirm: true },
  { value: 'owner_capital', label: 'Owner capital introduced', accountantConfirm: true },
  { value: 'expense_reimbursement', label: 'Reimbursement for business expense', accountantConfirm: true },
  { value: 'director_loan', label: 'Director / shareholder loan', accountantConfirm: true },
  { value: 'owner_equity', label: 'Owner loan / contribution / drawings (legacy)', accountantConfirm: true, legacy: true },
  { value: 'other', label: 'Other' },
]

/** Categories offered in the capture UI (excludes legacy values). */
export const SELECTABLE_EXPENSE_CATEGORIES: readonly ExpenseCategory[] =
  EXPENSE_CATEGORIES.filter((c) => !c.legacy)

/** Genuine owner capital introduced — the only thing subtracted from cash to
 *  get the net-of-owner-funding position. NOT loans or reimbursements. */
export const OWNER_CAPITAL_CATEGORY = 'owner_capital'
/** Owner repaying the business for a company-paid cost; offsets that expense. */
export const EXPENSE_REIMBURSEMENT_CATEGORY = 'expense_reimbursement'
/** Repayable director / shareholder loan. */
export const DIRECTOR_LOAN_CATEGORY = 'director_loan'

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
