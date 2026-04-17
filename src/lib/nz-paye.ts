/**
 * NZ PAYE calculator for 2025-2026 tax year.
 * Uses the standard NZ tax brackets applied to annualised income.
 * Supports common tax codes: M, ME, SB, S, SH, ST, ND.
 */

// Annual tax brackets for primary income (M, ME)
const PRIMARY_BRACKETS = [
  { threshold: 14000, rate: 0.105 },
  { threshold: 48000, rate: 0.175 },
  { threshold: 70000, rate: 0.30 },
  { threshold: 180000, rate: 0.33 },
  { threshold: Infinity, rate: 0.39 },
]

// Secondary tax rates (approximate for common codes)
const SECONDARY_RATES: Record<string, number> = {
  SB: 0.105,
  S: 0.175,
  SH: 0.30,
  ST: 0.33,
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
  employeeKiwisaver: number
  netPay: number
  employerKiwisaver: number
  totalEmployerCost: number
  holidayPay: number
  effectiveGross: number
}

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

  // Holiday pay (8% for pay-as-you-go)
  const holidayPay = params.holidayPayMethod === 'pay_as_you_go_8_percent'
    ? grossPay * 0.08
    : 0

  const effectiveGross = grossPay + holidayPay

  // Calculate PAYE
  const code = (params.taxCode || 'M').toUpperCase()
  let paye: number

  if (code === 'ND') {
    // No declaration — flat 45%
    paye = effectiveGross * 0.45
  } else if (SECONDARY_RATES[code] !== undefined) {
    // Secondary flat rate
    paye = effectiveGross * SECONDARY_RATES[code]
  } else {
    // Primary (M, ME) — annualise, calc tax, de-annualise
    const periodsPerYear = params.payFrequency === 'weekly' ? 52 : 26
    const annualIncome = effectiveGross * periodsPerYear
    const annualTax = calcAnnualPrimaryTax(annualIncome)
    paye = annualTax / periodsPerYear
  }

  paye = Math.round(paye * 100) / 100

  // KiwiSaver
  const employeeKS = params.kiwisaverEnrolled
    ? Math.round(effectiveGross * (params.kiwisaverEmployeeRate / 100) * 100) / 100
    : 0

  const employerKS = params.kiwisaverEnrolled
    ? Math.round(effectiveGross * (params.kiwisaverEmployerRate / 100) * 100) / 100
    : 0

  const netPay = Math.round((effectiveGross - paye - employeeKS) * 100) / 100
  const totalEmployerCost = Math.round((effectiveGross + employerKS) * 100) / 100

  return {
    grossPay,
    paye,
    employeeKiwisaver: employeeKS,
    netPay,
    employerKiwisaver: employerKS,
    totalEmployerCost,
    holidayPay,
    effectiveGross,
  }
}
