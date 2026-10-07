// Accountant pack — one period's books as plain rows, for the Excel workbook
// and the on-screen preview at /portal/finance/accountant-pack.
//
// Split in two so the maths is testable without a database:
//   • buildAccountantPack(raw, from, to)  — pure: GST splits, receivables
//     ageing, GST summary, the P&L, and the "needs attention" checks
//   • loadAccountantPackRaw (accountant-pack-data.ts) — the Supabase reads
//
// Basis notes the accountant needs (also printed on the Summary sheet):
//   • Sales GST is shown on BOTH bases — invoice (by issue date) and payments
//     (by paid date) — because the filing basis isn't recorded in the system.
//   • Purchases GST is by payment date (cash) — we hold payment dates, not
//     supplier invoice dates.
//   • Contractor GST comes from each contractor invoice's verified GST status
//     ('applied' → its stored gst_amount). Anything not assessed is 0 and is
//     listed under Needs attention — never guessed.

import { computeDocumentTotals } from '@/lib/doc-totals'
import { GST_INCLUSIVE_FRACTION } from '@/lib/payroll/gst'
import { expenseCategoryLabel, isAccountantConfirmCategory, isNeverGstCategory } from '@/lib/expense-categories'
import {
  buildProfitLoss,
  findRemittanceDuplicates,
  CONTRACTOR_COST_CATEGORY,
  type ProfitLoss,
} from './profit-loss'
import { invoiceInclusiveTotal } from './profit-loss-data'

// ── Raw rows (as loaded) ────────────────────────────────────────────────────

export interface RawInvoice {
  invoice_number: string | null
  status: string | null
  base_price: number | null
  discount: number | null
  gst_included: boolean | null
  date_issued: string | null
  due_date: string | null
  date_paid: string | null
  stripe_payment_intent_id: string | null
  client_name: string
  invoice_items: Array<{ price: number | null }> | null
}
export interface RawExpense {
  expense_date: string | null
  amount: number | null
  category: string | null
  vendor: string | null
  description: string | null
  payment_reference: string | null
  gst_inclusive: boolean | null
  receipt_path: string | null
}
export interface RawRemittanceItem {
  remittance_id: string
  remittance_number: string | null
  payment_date: string | null
  reference: string | null
  contractor_name: string | null
  contractor_gst_number: string | null
  job_number: string | null
  label: string | null
  amount: number | null
  wht_amount: number | null
  /** From the linked contractor invoice, when there is one. */
  ci_gst_status: string | null
  ci_gst_amount: number | null
  ci_amount: number | null
}
export interface RawPayLine {
  pay_run_id: string
  pay_date: string | null
  period_start: string | null
  period_end: string | null
  run_status: string | null
  payday_filing_status: string | null
  employee: string | null
  hours_worked: number | null
  gross_pay: number | null
  holiday_pay: number | null
  paye: number | null
  student_loan: number | null
  kiwisaver_employee: number | null
  kiwisaver_employer: number | null
  esct: number | null
  net_pay: number | null
  mileage_reimbursement: number | null
}
export interface RawBankTxn {
  id: string
  txn_date: string | null
  account: string | null
  tran_type: string | null
  payee: string | null
  memo: string | null
  amount: number | null
  direction: string | null
  cleared: boolean | null
}
export interface RawMileage {
  log_date: string | null
  person_label: string | null
  business_purpose: string | null
  distance_km: number | null
  rate_per_km: number | null
  reimbursement_amount: number | null
  status: string | null
}
export interface RawContractorPayable {
  invoice_number: string | null
  contractor_name: string | null
  amount: number | null
  gst_amount: number | null
  gst_status: string | null
  date_submitted: string | null
  service_date: string | null
}

export interface AccountantPackRaw {
  invoices: RawInvoice[]
  expenses: RawExpense[]
  remittanceItems: RawRemittanceItem[]
  /** remittance_id → total allocated to bank transactions (live allocations). */
  remittanceAllocated: Record<string, number>
  payLines: RawPayLine[]
  /** Employee pay runs that are not paid (draft / approved), any date. */
  unpaidPayRuns: Array<{ id: string; status: string | null; pay_date: string | null; period_end: string | null }>
  bank: RawBankTxn[]
  /** Latest bank transaction date across ALL imports (import coverage). */
  bankLatestDate: string | null
  mileage: RawMileage[]
  /** Approved, unpaid contractor invoices (current). */
  contractorPayables: RawContractorPayable[]
}

// ── Output ──────────────────────────────────────────────────────────────────

export type Row = Record<string, string | number | boolean | null>

export interface AttentionItem {
  area: string
  issue: string
  count: number
  amount: number | null
  action: string
}

export interface GstMonth {
  month: string
  salesGstInvoiceBasis: number
  salesGstPaymentsBasis: number
  purchasesGstExpenses: number
  purchasesGstContractors: number
  netInvoiceBasis: number
  netPaymentsBasis: number
}

export interface AccountantPack {
  from: string
  to: string
  /** Balance date for receivables: period end, or today if the period is still open. */
  asAt: string
  sales: Row[]
  received: Row[]
  receivables: Row[]
  expenses: Row[]
  contractorPayments: Row[]
  contractorPayables: Row[]
  payroll: Row[]
  bank: Row[]
  mileage: Row[]
  gst: GstMonth[]
  pl: ProfitLoss
  attention: AttentionItem[]
  totals: {
    salesExGst: number
    salesGst: number
    salesInclGst: number
    receivedInclGst: number
    receivablesInclGst: number
    contractorPayablesTotal: number
    purchasesGst: number
  }
}

// ── Helpers ─────────────────────────────────────────────────────────────────

const r2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100
const inRange = (d: string | null, from: string, to: string) => !!d && d.slice(0, 10) >= from && d.slice(0, 10) <= to
const sum = (rows: Row[], key: string) => r2(rows.reduce((s, r) => s + Number(r[key] ?? 0), 0))

function invoiceSplit(i: RawInvoice) {
  const items = (i.invoice_items ?? []).reduce((s, it) => s + Number(it.price ?? 0), 0)
  const t = computeDocumentTotals(Number(i.base_price ?? 0) + items - Number(i.discount ?? 0), !!i.gst_included)
  return { exGst: r2(t.subtotalExGst), gst: r2(t.gstAmount), incl: r2(t.total) }
}

function shiftDays(iso: string, days: number): string {
  const d = new Date(`${iso}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10)
}

/** Whole days from a to b ('YYYY-MM-DD'); positive when b is later. */
function daysBetween(a: string, b: string): number {
  return Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / 86_400_000)
}

export function ageBucket(dueDate: string | null, asAt: string): string {
  if (!dueDate) return 'No due date'
  const overdue = daysBetween(dueDate.slice(0, 10), asAt)
  if (overdue <= 0) return 'Current'
  if (overdue <= 30) return '1–30 days'
  if (overdue <= 60) return '31–60 days'
  if (overdue <= 90) return '61–90 days'
  return '90+ days'
}

/** Issued (not draft / cancelled / void). */
function isIssued(i: RawInvoice): boolean {
  return !!i.date_issued && !['draft', 'cancelled', 'void'].includes(i.status ?? '')
}

/** GST claimable inside an expense, by its flag + category. */
export function expenseGst(e: { amount: number | null; category: string | null; gst_inclusive: boolean | null }): number {
  if (!e.gst_inclusive || isNeverGstCategory(e.category)) return 0
  return r2(Number(e.amount ?? 0) * GST_INCLUSIVE_FRACTION)
}

/** Contractor GST from the linked invoice's verified status — 0 unless 'applied'. */
function contractorItemGst(it: RawRemittanceItem): number {
  if (it.ci_gst_status !== 'applied' || it.ci_gst_amount == null) return 0
  // Scale when the item pays a different amount than the invoice (part payment).
  const ciAmt = Number(it.ci_amount ?? 0)
  const amt = Number(it.amount ?? 0)
  if (ciAmt > 0 && Math.abs(ciAmt - amt) > 0.005) return r2(Number(it.ci_gst_amount) * (amt / ciAmt))
  return r2(Number(it.ci_gst_amount))
}

function monthsIn(from: string, to: string): string[] {
  const out: string[] = []
  let [y, m] = from.slice(0, 7).split('-').map(Number)
  const end = to.slice(0, 7)
  for (let guard = 0; guard < 120; guard++) {
    const key = `${y}-${String(m).padStart(2, '0')}`
    if (key > end) break
    out.push(key)
    m += 1
    if (m === 13) { m = 1; y += 1 }
  }
  return out
}

/** Paid employee pay runs in the period whose payday filing isn't submitted/accepted. */
function payrollPaidRunsNotFiled(raw: AccountantPackRaw, from: string, to: string): string[] {
  return raw.payLines
    .filter((l) => l.run_status === 'paid' && inRange(l.pay_date ?? l.period_end, from, to))
    .filter((l) => !['submitted', 'accepted'].includes(l.payday_filing_status ?? ''))
    .map((l) => l.pay_run_id)
}

// ── Builder ─────────────────────────────────────────────────────────────────

export function buildAccountantPack(raw: AccountantPackRaw, from: string, to: string, today: string = to): AccountantPack {
  // Balances (receivables, ageing) are as at the period end, or today when the
  // period hasn't finished yet — otherwise every open invoice reads overdue.
  const asAt = to < today ? to : today
  // Sales — issued in period.
  const salesInv = raw.invoices.filter((i) => isIssued(i) && inRange(i.date_issued, from, to))
  const sales: Row[] = salesInv
    .sort((a, b) => (a.date_issued ?? '').localeCompare(b.date_issued ?? ''))
    .map((i) => {
      const s = invoiceSplit(i)
      return {
        invoice: i.invoice_number ?? '',
        client: i.client_name,
        issued: i.date_issued,
        due: i.due_date,
        status: i.status ?? '',
        paid: i.date_paid,
        entered: i.gst_included ? 'Incl GST' : 'Excl GST',
        exGst: s.exGst,
        gst: s.gst,
        incl: s.incl,
      }
    })

  // Payments received — paid in period (cash in).
  const paidInv = raw.invoices.filter((i) => i.status === 'paid' && inRange(i.date_paid, from, to))
  const received: Row[] = paidInv
    .sort((a, b) => (a.date_paid ?? '').localeCompare(b.date_paid ?? ''))
    .map((i) => {
      const s = invoiceSplit(i)
      return {
        paid: i.date_paid,
        invoice: i.invoice_number ?? '',
        client: i.client_name,
        method: i.stripe_payment_intent_id ? 'Card (Stripe)' : 'Bank / manual',
        exGst: s.exGst,
        gst: s.gst,
        incl: s.incl,
      }
    })

  // Receivables at asAt — issued on/before asAt, not paid by asAt.
  const receivables: Row[] = raw.invoices
    .filter((i) => isIssued(i) && (i.date_issued ?? '') <= asAt && !(i.status === 'paid' && i.date_paid && i.date_paid <= asAt))
    .filter((i) => i.status !== 'paid' || !!i.date_paid) // paid with no date: can't place it, skip
    .sort((a, b) => (a.due_date ?? '').localeCompare(b.due_date ?? ''))
    .map((i) => {
      const s = invoiceSplit(i)
      return {
        invoice: i.invoice_number ?? '',
        client: i.client_name,
        issued: i.date_issued,
        due: i.due_date,
        age: ageBucket(i.due_date, asAt),
        incl: s.incl,
      }
    })

  // P&L (shared definition).
  const plExpenses = raw.expenses.map((e) => ({ amount: Number(e.amount ?? 0), category: e.category, expenseDate: e.expense_date }))
  const remitTotals = new Map<string, { amount: number; paymentDate: string | null }>()
  for (const it of raw.remittanceItems) {
    const prev = remitTotals.get(it.remittance_id) ?? { amount: 0, paymentDate: it.payment_date }
    remitTotals.set(it.remittance_id, { amount: r2(prev.amount + Number(it.amount ?? 0)), paymentDate: it.payment_date })
  }
  const plRemittances = Array.from(remitTotals.values())
  const pl = buildProfitLoss({
    income: raw.invoices
      .filter((i) => i.status === 'paid')
      .map((i) => ({ total: invoiceInclusiveTotal(i), datePaid: i.date_paid })),
    expenses: plExpenses,
    remittances: plRemittances,
    from,
    to,
  })
  const dupIdx = findRemittanceDuplicates(plExpenses, plRemittances)

  // Expenses — in period, with GST + treatment.
  const expenseRows: Array<Row & { _dup: boolean }> = []
  raw.expenses.forEach((e, i) => {
    if (!inRange(e.expense_date, from, to)) return
    const dup = dupIdx.has(i)
    const cat = e.category ?? 'other'
    const gst = dup ? 0 : expenseGst(e)
    const amount = Number(e.amount ?? 0)
    const treatment = dup
      ? 'Excluded — duplicate of a remittance'
      : cat === CONTRACTOR_COST_CATEGORY
        ? 'Cost of sales'
        : isAccountantConfirmCategory(cat)
          ? 'Below the line — confirm'
          : 'Operating expense'
    expenseRows.push({
      date: e.expense_date,
      category: expenseCategoryLabel(cat),
      vendor: e.vendor ?? '',
      description: e.description ?? '',
      amount: r2(amount),
      gst,
      exGst: r2(amount - gst),
      treatment,
      reference: e.payment_reference ?? '',
      receipt: e.receipt_path ? 'Yes' : 'No',
      _dup: dup,
    })
  })
  expenseRows.sort((a, b) => String(a.date ?? '').localeCompare(String(b.date ?? '')))
  const expenses: Row[] = expenseRows.map((e) => {
    const rest: Row = { ...e }
    delete rest._dup
    return rest
  })

  // Contractor payments — remittance items paid in period.
  const remitInRange = raw.remittanceItems.filter((it) => inRange(it.payment_date, from, to))
  const contractorPayments: Row[] = remitInRange
    .sort((a, b) => (a.payment_date ?? '').localeCompare(b.payment_date ?? '') || (a.remittance_number ?? '').localeCompare(b.remittance_number ?? ''))
    .map((it) => {
      const amount = r2(Number(it.amount ?? 0))
      const gst = contractorItemGst(it)
      return {
        paid: it.payment_date,
        remittance: it.remittance_number ?? '',
        reference: it.reference ?? '',
        contractor: it.contractor_name ?? '',
        gstNumber: it.contractor_gst_number ?? '',
        job: it.job_number || it.label || '',
        amount,
        gst,
        exGst: r2(amount - gst),
        wht: r2(Number(it.wht_amount ?? 0)),
        gstStatus: it.ci_gst_status ?? 'not linked',
      }
    })

  const contractorPayables: Row[] = raw.contractorPayables.map((p) => ({
    invoice: p.invoice_number ?? '',
    contractor: p.contractor_name ?? '',
    serviceDate: p.service_date,
    submitted: p.date_submitted,
    amount: r2(Number(p.amount ?? 0)),
    gst: p.gst_status === 'applied' ? r2(Number(p.gst_amount ?? 0)) : 0,
    gstStatus: p.gst_status ?? '',
  }))

  // Payroll — paid employee pay runs, by pay date.
  const payroll: Row[] = raw.payLines
    .filter((l) => l.run_status === 'paid' && inRange(l.pay_date ?? l.period_end, from, to))
    .sort((a, b) => (a.pay_date ?? a.period_end ?? '').localeCompare(b.pay_date ?? b.period_end ?? ''))
    .map((l) => ({
      payDate: l.pay_date ?? l.period_end,
      periodStart: l.period_start,
      periodEnd: l.period_end,
      employee: l.employee ?? '',
      hours: Number(l.hours_worked ?? 0),
      gross: r2(Number(l.gross_pay ?? 0)),
      holidayPay: r2(Number(l.holiday_pay ?? 0)),
      paye: r2(Number(l.paye ?? 0)),
      studentLoan: r2(Number(l.student_loan ?? 0)),
      ksEmployee: r2(Number(l.kiwisaver_employee ?? 0)),
      ksEmployer: r2(Number(l.kiwisaver_employer ?? 0)),
      esct: r2(Number(l.esct ?? 0)),
      net: r2(Number(l.net_pay ?? 0)),
      mileage: r2(Number(l.mileage_reimbursement ?? 0)),
      filing: l.payday_filing_status ?? '',
    }))

  const bankInRange = raw.bank.filter((b) => inRange(b.txn_date, from, to))
  const bank: Row[] = bankInRange
    .sort((a, b) => (a.txn_date ?? '').localeCompare(b.txn_date ?? ''))
    .map((b) => ({
      date: b.txn_date,
      account: b.account ?? '',
      type: b.tran_type ?? '',
      payee: b.payee ?? '',
      memo: b.memo ?? '',
      amount: r2(Number(b.amount ?? 0)),
      reconciled: b.cleared ? 'Yes' : 'No',
    }))

  const mileage: Row[] = raw.mileage
    .filter((m) => inRange(m.log_date, from, to))
    .sort((a, b) => (a.log_date ?? '').localeCompare(b.log_date ?? ''))
    .map((m) => ({
      date: m.log_date,
      person: m.person_label ?? '',
      purpose: m.business_purpose ?? '',
      km: Number(m.distance_km ?? 0),
      rate: m.rate_per_km == null ? null : Number(m.rate_per_km),
      amount: r2(Number(m.reimbursement_amount ?? 0)),
      status: m.status ?? '',
    }))

  // GST summary by month.
  const gst: GstMonth[] = monthsIn(from, to).map((month) => {
    const mFrom = `${month}-01`
    const mTo = `${month}-31`
    const sGstInv = r2(salesInv.filter((i) => inRange(i.date_issued, mFrom, mTo)).reduce((s, i) => s + invoiceSplit(i).gst, 0))
    const sGstPay = r2(paidInv.filter((i) => inRange(i.date_paid, mFrom, mTo)).reduce((s, i) => s + invoiceSplit(i).gst, 0))
    const pExp = r2(expenseRows.filter((e) => inRange(e.date as string | null, mFrom, mTo) && !e._dup).reduce((s, e) => s + Number(e.gst ?? 0), 0))
    const pCon = r2(contractorPayments.filter((c) => inRange(c.paid as string | null, mFrom, mTo)).reduce((s, c) => s + Number(c.gst ?? 0), 0))
    return {
      month,
      salesGstInvoiceBasis: sGstInv,
      salesGstPaymentsBasis: sGstPay,
      purchasesGstExpenses: pExp,
      purchasesGstContractors: pCon,
      netInvoiceBasis: r2(sGstInv - pExp - pCon),
      netPaymentsBasis: r2(sGstPay - pExp - pCon),
    }
  })

  // ── Needs attention ──
  const attention: AttentionItem[] = []
  const push = (a: AttentionItem) => { if (a.count > 0) attention.push(a) }

  const unrecIn = bankInRange.filter((b) => !b.cleared && b.direction === 'in')
  const unrecOut = bankInRange.filter((b) => !b.cleared && b.direction !== 'in')
  push({ area: 'Bank', issue: 'Money in not reconciled', count: unrecIn.length, amount: r2(unrecIn.reduce((s, b) => s + Number(b.amount ?? 0), 0)), action: 'Match on Reports → Bank reconciliation (money in).' })
  push({ area: 'Bank', issue: 'Money out not reconciled', count: unrecOut.length, amount: r2(unrecOut.reduce((s, b) => s + Number(b.amount ?? 0), 0)), action: 'Match on Reports → Bank reconciliation (money out).' })
  // A finished period needs statements to its last day; an open one, to within a week.
  const bankNeededTo = to < today ? to : shiftDays(today, -7)
  if (!raw.bankLatestDate || raw.bankLatestDate < bankNeededTo) {
    attention.push({ area: 'Bank', issue: `Bank statements only imported up to ${raw.bankLatestDate ?? 'never'}`, count: 1, amount: null, action: `Import the ASB CSV through ${bankNeededTo} so the period is complete.` })
  }

  const noReceipt = expenseRows.filter((e) => e.receipt === 'No' && !e._dup && e.treatment !== 'Below the line — confirm')
  push({ area: 'Expenses', issue: 'Expenses with no receipt attached', count: noReceipt.length, amount: sum(noReceipt, 'amount'), action: 'Attach receipts (needed to support GST claims).' })
  const other = expenseRows.filter((e) => e.category === expenseCategoryLabel('other'))
  push({ area: 'Expenses', issue: "Expenses categorised as 'Other'", count: other.length, amount: sum(other, 'amount'), action: 'Recategorise so they land on the right P&L line.' })
  const below = expenseRows.filter((e) => e.treatment === 'Below the line — confirm')
  push({ area: 'Expenses', issue: 'Capital / owner / IRD items — treatment to confirm', count: below.length, amount: sum(below, 'amount'), action: 'Accountant to confirm treatment (asset, equity, loan, tax).' })
  const dups = expenseRows.filter((e) => e._dup)
  push({ area: 'Expenses', issue: 'Contractor-payment expenses duplicating a remittance (excluded)', count: dups.length, amount: sum(dups, 'amount'), action: 'No action needed — shown so the exclusion is visible. Delete the expense if you prefer.' })

  const notAssessed = contractorPayments.filter((c) => c.gstStatus !== 'applied' && c.gstStatus !== 'not_registered')
  push({ area: 'Contractors', issue: 'Contractor payments with GST not assessed', count: notAssessed.length, amount: sum(notAssessed, 'amount'), action: 'Confirm each contractor’s GST registration — GST shown as $0 until confirmed.' })
  const unallocated = Array.from(new Set(remitInRange.map((it) => it.remittance_id)))
    .filter((id) => (raw.remittanceAllocated[id] ?? 0) <= 0)
  const unallocatedAmt = r2(remitInRange.filter((it) => unallocated.includes(it.remittance_id)).reduce((s, it) => s + Number(it.amount ?? 0), 0))
  push({ area: 'Contractors', issue: 'Remittances with no bank payment linked', count: unallocated.length, amount: unallocatedAmt, action: 'Link each to its bank debit on Bank reconciliation (money out).' })
  push({ area: 'Contractors', issue: 'Approved contractor invoices not yet paid (owed now)', count: contractorPayables.length, amount: sum(contractorPayables, 'amount'), action: 'Pay or include in the next remittance; accountant may accrue at balance date.' })

  const unpaidRuns = raw.unpaidPayRuns.filter((p) => (p.pay_date ?? p.period_end ?? '') <= to)
  const paidRunIds = new Set(payrollPaidRunsNotFiled(raw, from, to))
  push({ area: 'Payroll', issue: 'Paid pay runs with payday filing not recorded as submitted', count: paidRunIds.size, amount: null, action: 'If already filed in myIR, mark it submitted on the pay run; if not, file now (due within 2 working days of payday).' })
  // Wages in the P&L come from Expenses; payroll is the record of what was paid.
  const payrollGross = sum(payroll, 'gross')
  const wagesExpensed = r2(expenseRows.filter((e) => e.category === expenseCategoryLabel('wages_payroll')).reduce((s, e) => s + Number(e.amount ?? 0), 0))
  if (Math.abs(payrollGross - wagesExpensed) >= 0.01) {
    attention.push({ area: 'Payroll', issue: `Wages in the P&L (${wagesExpensed.toFixed(2)} from Expenses) differ from paid pay runs (${payrollGross.toFixed(2)} gross)`, count: 1, amount: r2(payrollGross - wagesExpensed), action: 'Use the Payroll sheet for wages; accountant to adjust the P&L wages line.' })
  }
  push({ area: 'Payroll', issue: 'Employee pay runs not marked paid (draft / approved)', count: unpaidRuns.length, amount: null, action: 'Mark paid or delete so payroll totals are complete.' })

  const exclInv = salesInv.filter((i) => !i.gst_included)
  push({ area: 'Sales', issue: 'Invoices entered GST-exclusive (15% added on top)', count: exclInv.length, amount: r2(exclInv.reduce((s, i) => s + invoiceSplit(i).incl, 0)), action: 'Info only — totals here already include the GST.' })
  const overdue = receivables.filter((r) => r.age !== 'Current' && r.age !== 'No due date')
  push({ area: 'Sales', issue: `Overdue invoices at ${asAt}`, count: overdue.length, amount: sum(overdue, 'incl'), action: 'Chase, or flag to the accountant as doubtful.' })

  return {
    from,
    to,
    asAt,
    sales,
    received,
    receivables,
    expenses,
    contractorPayments,
    contractorPayables,
    payroll,
    bank,
    mileage,
    gst,
    pl,
    attention,
    totals: {
      salesExGst: sum(sales, 'exGst'),
      salesGst: sum(sales, 'gst'),
      salesInclGst: sum(sales, 'incl'),
      receivedInclGst: sum(received, 'incl'),
      receivablesInclGst: sum(receivables, 'incl'),
      contractorPayablesTotal: sum(contractorPayables, 'amount'),
      purchasesGst: r2(gst.reduce((s, g) => s + g.purchasesGstExpenses + g.purchasesGstContractors, 0)),
    },
  }
}
