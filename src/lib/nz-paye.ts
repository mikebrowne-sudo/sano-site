/**
 * Pay-preview adapter for secondary / student-loan / non-notified tax codes,
 * plus KiwiSaver + holiday-pay display.
 *
 * The income-tax brackets + ACC earner levy are NOT duplicated here — they come
 * from the single canonical engine in `payroll/paye.ts`. This module only adds
 * the code-specific handling that engine doesn't model directly (secondary flat
 * rates, student loan, ND) and the KiwiSaver/holiday-pay preview shape.
 */

import { annualIncomeTax, annualAccLevy, periodsPerYear, type PayPeriod } from '@/lib/payroll/paye'
import { computeEsct } from '@/lib/payroll/esct'
import {
  KS_EMPLOYEE_STANDARD_RATES,
  KS_DEFAULT_EMPLOYEE,
  KS_DEFAULT_EMPLOYER,
  KS_RATE_SOURCES,
} from '@/lib/payroll/kiwisaver'

// IRD payroll truncates (not rounds): whole-dollar gross for the PAYE/SL calc,
// and truncate deduction results to the cent. Net pay is the residual, rounded.
const round2 = (n: number) => Math.round(n * 100) / 100
const trunc2 = (n: number) => Math.floor(n * 100) / 100
const floorDollar = (n: number) => Math.floor(n)

// Secondary tax flat rates
const SECONDARY_RATES: Record<string, number> = {
  SB: 0.105,
  S: 0.175,
  SH: 0.30,
  ST: 0.33,
  SA: 0.39,
}

// Student loan repayment: 12% of the whole-dollar gross. PRIMARY SL codes get
// the pay-period threshold below (annual $24,128, unchanged for 2026/27);
// SECONDARY SL codes have no threshold (12% of the whole gross).
const SL_RATE = 0.12
const SL_PERIOD_THRESHOLD: Record<'weekly' | 'fortnightly', number> = {
  weekly: 464, // 24,128 / 52
  fortnightly: 928, // 24,128 / 26
}

// Codes that include student loan
const SL_CODES = new Set(['M SL', 'ME SL', 'SB SL', 'S SL', 'SH SL', 'ST SL', 'SA SL'])

// Extract base tax code from SL variant
function baseCode(code: string): string {
  return code.replace(' SL', '').trim()
}

export interface PayPreview {
  grossPay: number
  paye: number
  studentLoan: number
  employeeKiwisaver: number
  netPay: number
  employerKiwisaver: number
  /** Flat ESCT rate applied to the employer contribution. */
  esctRate: number
  /** ESCT withheld from the employer contribution (to IRD). */
  employerEsct: number
  /** Employer contribution reaching the employee's KiwiSaver (after ESCT). */
  employerKiwisaverNet: number
  totalEmployerCost: number
  holidayPay: number
  effectiveGross: number
}

export const TAX_CODES = [
  { value: 'M', label: 'M — Primary', group: 'Primary' },
  { value: 'ME', label: 'ME — Primary (exempt)', group: 'Primary' },
  { value: 'M SL', label: 'M SL — Primary + Student Loan', group: 'Primary' },
  { value: 'ME SL', label: 'ME SL — Primary (exempt) + SL', group: 'Primary' },
  { value: 'SB', label: 'SB — Secondary (10.5%)', group: 'Secondary' },
  { value: 'S', label: 'S — Secondary (17.5%)', group: 'Secondary' },
  { value: 'SH', label: 'SH — Secondary (30%)', group: 'Secondary' },
  { value: 'ST', label: 'ST — Secondary (33%)', group: 'Secondary' },
  { value: 'SA', label: 'SA — Secondary (39%)', group: 'Secondary' },
  { value: 'SB SL', label: 'SB SL — Secondary + SL', group: 'Secondary + SL' },
  { value: 'S SL', label: 'S SL — Secondary + SL', group: 'Secondary + SL' },
  { value: 'SH SL', label: 'SH SL — Secondary + SL', group: 'Secondary + SL' },
  { value: 'ST SL', label: 'ST SL — Secondary + SL', group: 'Secondary + SL' },
  { value: 'SA SL', label: 'SA SL — Secondary + SL', group: 'Secondary + SL' },
  { value: 'ND', label: 'ND — No declaration (45%)', group: 'Non-notified' },
]

// KiwiSaver rate constants are centralised in `@/lib/payroll/kiwisaver` (the
// single source of truth). Re-exported here for back-compat with existing
// imports. `KS_EMPLOYEE_RATES` is the STANDARD employee election set — 3% is
// deliberately excluded (it is valid only under a temporary rate reduction,
// which staff apply on the worker record, not something an employee elects).
export const KS_EMPLOYEE_RATES = KS_EMPLOYEE_STANDARD_RATES
export { KS_DEFAULT_EMPLOYEE, KS_DEFAULT_EMPLOYER, KS_RATE_SOURCES }

export function calculatePayPreview(params: {
  hoursWorked: number
  hourlyRate: number
  payFrequency: 'weekly' | 'fortnightly'
  taxCode: string
  kiwisaverEnrolled: boolean
  kiwisaverEmployeeRate: number
  kiwisaverEmployerRate: number
  holidayPayMethod: string | null
}): PayPreview {
  const grossPay = params.hoursWorked * params.hourlyRate

  // Holiday pay (for pay-as-you-go)
  const holidayPay = params.holidayPayMethod === 'pay_as_you_go_8_percent'
    ? grossPay * 0.08
    : 0

  const effectiveGross = grossPay + holidayPay
  const period: PayPeriod = params.payFrequency
  const n = periodsPerYear(period)
  // Determine tax code
  const code = (params.taxCode || 'M').toUpperCase()
  const hasSL = SL_CODES.has(code)
  const base = baseCode(code)

  // PAYE = income tax + ACC earner levy, calculated on the WHOLE-DOLLAR gross
  // (IRD truncates the gross first) and truncated to the cent. Income-tax
  // brackets + the levy come from the single canonical engine; this picks the
  // income-tax basis per code. ND is the flat 45% non-declaration rate.
  const grossDollar = floorDollar(effectiveGross)
  const annualDollar = grossDollar * n
  let paye: number
  if (code === 'ND') {
    paye = trunc2(grossDollar * 0.45)
  } else {
    const incomeTaxPeriod = SECONDARY_RATES[base] !== undefined
      ? grossDollar * SECONDARY_RATES[base]                 // secondary flat rate
      : annualIncomeTax(annualDollar) / n                  // primary (M, ME)
    const accLevyPeriod = annualAccLevy(annualDollar) / n
    paye = trunc2(incomeTaxPeriod + accLevyPeriod)
  }

  // Student loan — 12% of the whole-dollar gross, truncated. SECONDARY SL codes
  // (S SL, SH SL, ...) have NO repayment threshold — the full gross is charged.
  // Only PRIMARY SL codes (M SL, ME SL) get the pay-period threshold.
  let studentLoan = 0
  if (hasSL) {
    const slThreshold = SECONDARY_RATES[base] !== undefined ? 0 : SL_PERIOD_THRESHOLD[period]
    studentLoan = trunc2(Math.max(0, grossDollar - slThreshold) * SL_RATE)
  }

  // KiwiSaver — rate on the full gross, truncated to the cent (IRD).
  const employeeKS = params.kiwisaverEnrolled
    ? trunc2(effectiveGross * (params.kiwisaverEmployeeRate / 100))
    : 0

  const employerKS = params.kiwisaverEnrolled
    ? trunc2(effectiveGross * (params.kiwisaverEmployerRate / 100))
    : 0

  // ESCT — tax on the employer contribution, withheld from it (not added on
  // top). Threshold amount estimated by annualising this run.
  const annualThreshold = (effectiveGross + employerKS) * n
  const esctSplit = computeEsct(employerKS, annualThreshold)

  const netPay = round2(effectiveGross - paye - studentLoan - employeeKS)
  const totalEmployerCost = round2(effectiveGross + employerKS)

  return {
    grossPay,
    paye,
    studentLoan,
    employeeKiwisaver: employeeKS,
    netPay,
    employerKiwisaver: employerKS,
    esctRate: esctSplit.rate,
    employerEsct: esctSplit.esct,
    employerKiwisaverNet: esctSplit.netContribution,
    totalEmployerCost,
    holidayPay,
    effectiveGross,
  }
}
