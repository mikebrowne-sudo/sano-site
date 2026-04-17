/**
 * NZ PAYE calculator for 2025-2026 tax year.
 * Uses standard NZ tax brackets applied to annualised income.
 * Supports primary, secondary, student loan, and non-notified codes.
 */

// Annual tax brackets for primary income (M, ME)
const PRIMARY_BRACKETS = [
  { threshold: 14000, rate: 0.105 },
  { threshold: 48000, rate: 0.175 },
  { threshold: 70000, rate: 0.30 },
  { threshold: 180000, rate: 0.33 },
  { threshold: Infinity, rate: 0.39 },
]

// Secondary tax flat rates
const SECONDARY_RATES: Record<string, number> = {
  SB: 0.105,
  S: 0.175,
  SH: 0.30,
  ST: 0.33,
  SA: 0.39,
}

// Student loan repayment: 12% on income over threshold
const SL_RATE = 0.12
const SL_ANNUAL_THRESHOLD = 24128

// Codes that include student loan
const SL_CODES = new Set(['M SL', 'ME SL', 'SB SL', 'S SL', 'SH SL', 'ST SL', 'SA SL'])

// Extract base tax code from SL variant
function baseCode(code: string): string {
  return code.replace(' SL', '').trim()
}

function calcAnnualPrimaryTax(annualIncome: number): number {
  let tax = 0
  let prev = 0
  for (const bracket of PRIMARY_BRACKETS) {
    if (annualIncome <= prev) break
    const taxable = Math.min(annualIncome, bracket.threshold) - prev
    if (taxable > 0) tax += taxable * bracket.rate
    prev = bracket.threshold
  }
  return tax
}

export interface PayPreview {
  grossPay: number
  paye: number
  studentLoan: number
  employeeKiwisaver: number
  netPay: number
  employerKiwisaver: number
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
  const periodsPerYear = params.payFrequency === 'weekly' ? 52 : 26

  // Determine tax code
  const code = (params.taxCode || 'M').toUpperCase()
  const hasSL = SL_CODES.has(code)
  const base = baseCode(code)

  // Calculate PAYE
  let paye: number

  if (code === 'ND') {
    paye = effectiveGross * 0.45
  } else if (SECONDARY_RATES[base] !== undefined) {
    paye = effectiveGross * SECONDARY_RATES[base]
  } else {
    // Primary (M, ME) — annualise, calc tax, de-annualise
    const annualIncome = effectiveGross * periodsPerYear
    const annualTax = calcAnnualPrimaryTax(annualIncome)
    paye = annualTax / periodsPerYear
  }

  paye = Math.round(paye * 100) / 100

  // Student loan
  let studentLoan = 0
  if (hasSL) {
    const annualIncome = effectiveGross * periodsPerYear
    const annualSL = Math.max(0, annualIncome - SL_ANNUAL_THRESHOLD) * SL_RATE
    studentLoan = Math.round((annualSL / periodsPerYear) * 100) / 100
  }

  // KiwiSaver
  const employeeKS = params.kiwisaverEnrolled
    ? Math.round(effectiveGross * (params.kiwisaverEmployeeRate / 100) * 100) / 100
    : 0

  const employerKS = params.kiwisaverEnrolled
    ? Math.round(effectiveGross * (params.kiwisaverEmployerRate / 100) * 100) / 100
    : 0

  const netPay = Math.round((effectiveGross - paye - studentLoan - employeeKS) * 100) / 100
  const totalEmployerCost = Math.round((effectiveGross + employerKS) * 100) / 100

  return {
    grossPay,
    paye,
    studentLoan,
    employeeKiwisaver: employeeKS,
    netPay,
    employerKiwisaver: employerKS,
    totalEmployerCost,
    holidayPay,
    effectiveGross,
  }
}
