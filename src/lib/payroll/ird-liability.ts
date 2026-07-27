// IRD liability ledger — the accumulated PAYE + KiwiSaver Sano owes IRD, grouped
// by IRD payment period. SEPARATE from employee payment and payday filing: a run
// being paid never touches this. Pure + testable.
//
// Total payable to IRD for a run = PAYE + employee KiwiSaver + GROSS employer
// KiwiSaver. ESCT is INSIDE the gross employer contribution — shown, never added.

const r2 = (n: number) => Math.round(n * 100) / 100

export interface LiabilityLineAmounts {
  paye: number
  employeeKs: number
  employerKsGross: number
  employerKsNet?: number | null
}

/** Total a run owes IRD + the ESCT-within breakdown. */
export function liabilityTotalForRun(a: LiabilityLineAmounts): { total: number; esct: number | null } {
  const esct = a.employerKsNet == null ? null : r2(a.employerKsGross - a.employerKsNet)
  return { total: r2(a.paye + a.employeeKs + a.employerKsGross), esct }
}

export interface IrdPeriod {
  periodKey: string // 'YYYY-MM'
  periodStart: string
  periodEnd: string
  dueDate: string
}

/**
 * The IRD payment period + due date for a payday, RESOLVED from the employer's
 * obligations (not hard-coded). Sano is a SMALL employer (< $500k PAYE/year), so
 * deductions are paid monthly, due the 20th of the month FOLLOWING the payday
 * month. (Large employers pay twice-monthly — switch on a config when that day
 * comes.) 'YYYY-MM-DD' in/out.
 */
export function irdPaymentPeriod(payday: string): IrdPeriod {
  const [y, m] = payday.split('-').map(Number)
  const periodKey = `${y}-${String(m).padStart(2, '0')}`
  const periodStart = `${periodKey}-01`
  const periodEnd = new Date(Date.UTC(y, m, 0)).toISOString().slice(0, 10) // last day of month m
  // Due the 20th of the following month.
  const dueY = m === 12 ? y + 1 : y
  const dueM = m === 12 ? 1 : m + 1
  const dueDate = `${dueY}-${String(dueM).padStart(2, '0')}-20`
  return { periodKey, periodStart, periodEnd, dueDate }
}

export type LiabilityStatus = 'accruing' | 'due' | 'partially_paid' | 'paid' | 'overdue' | 'adjusted'

export interface LiabilityStateInput {
  totalPayable: number
  amountPaid: number
  dueDate: string
  today: string
  hasAdjustments?: boolean
  /** True once the period is closed (all its pay runs approved) — moves accruing → due. */
  periodClosed?: boolean
}

/**
 * Derive the liability status.
 *  paid            — fully settled (paid ≥ payable).
 *  partially_paid  — some paid, not all.
 *  overdue         — unpaid balance past the due date.
 *  due             — closed period, balance owing, not yet due-passed.
 *  accruing        — period still open (more runs may land).
 *  adjusted        — carries adjustment lines (surfaced alongside the money state).
 */
export function deriveLiabilityStatus(i: LiabilityStateInput): LiabilityStatus {
  const outstanding = r2(i.totalPayable - i.amountPaid)
  if (outstanding <= 0 && i.totalPayable > 0) return 'paid'
  if (i.amountPaid > 0) return i.today > i.dueDate ? 'overdue' : 'partially_paid'
  if (i.hasAdjustments) return 'adjusted'
  if (i.today > i.dueDate) return 'overdue'
  return i.periodClosed ? 'due' : 'accruing'
}

export function liabilityOutstanding(totalPayable: number, amountPaid: number): number {
  return r2(totalPayable - amountPaid)
}
