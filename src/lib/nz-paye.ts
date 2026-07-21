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

const round2 = (n: number) => Math.round(n * 100) / 100
// IRD payroll truncates (not rounds): whole-dollar gross for the PAYE/SL calc,
// and truncate deduction results to the cent.
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

// Student loan repayment: 12% of earnings above the pay-period threshold.
// Annual threshold $24,128 (unchanged for 2026/27) → per-period thresholds below.
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

export const KS_EMPLOYEE_RATES = [3, 4, 6, 8, 10]
export const KS_DEFAULT_EMPLOYEE = 3
export const KS_DEFAULT_EMPLOYER = 3

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
  const annualIncome = effectiveGross * n

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

  // Student loan — 12% of earnings above the IRD pay-period threshold.
  let studentLoan = 0
  if (hasSL) {
    const slThreshold = SL_PERIOD_THRESHOLD[period]
    studentLoan = round2(Math.max(0, effectiveGross - slThreshold) * SL_RATE)
  }

  // KiwiSaver
  const employeeKS = params.kiwisaverEnrolled
    ? Math.round(effectiveGross * (params.kiwisaverEmployeeRate / 100) * 100) / 100
    : 0

  const employerKS = params.kiwisaverEnrolled
    ? Math.round(effectiveGross * (params.kiwisaverEmployerRate / 100) * 100) / 100
    : 0

  // ESCT — tax on the employer contribution, withheld from it (not added on
  // top). Threshold amount estimated by annualising this run.
  const annualThreshold = (effectiveGross + employerKS) * n
  const esctSplit = computeEsct(employerKS, annualThreshold)

  const netPay = Math.round((effectiveGross - paye - studentLoan - employeeKS) * 100) / 100
  const totalEmployerCost = Math.round((effectiveGross + employerKS) * 100) / 100

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
