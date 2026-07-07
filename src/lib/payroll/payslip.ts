// Payslip computation — pure + testable.
//
// The agreed hourly rate is INCLUSIVE of 8% holiday pay (per the casual
// employment agreement), so gross = hours × rate and the holiday-pay component
// is identified WITHIN that gross (8/108) on the payslip — nothing added on
// top. PAYE is on the full gross. KiwiSaver is 0 when the employee has opted
// out.

import { computePaye, type PayPeriod, type PayeRates, PAYE_RATES } from './paye'

const round2 = (n: number) => Math.round(n * 100) / 100

export interface PayslipInput {
  hours: number
  rate: number // inclusive of 8% holiday pay
  period: PayPeriod
  kiwiSaverEmployeeRate?: number // 0 when opted out
  rates?: PayeRates
}

export interface Payslip {
  hours: number
  rate: number
  gross: number
  /** The 8% holiday-pay portion identified within gross (8/108). */
  holidayPayComponent: number
  incomeTax: number
  accLevy: number
  paye: number
  kiwiSaver: number
  net: number
}

export function computePayslip(input: PayslipInput): Payslip {
  const rates = input.rates ?? PAYE_RATES
  const gross = round2((input.hours || 0) * (input.rate || 0))
  const holidayPayComponent = round2((gross * 8) / 108)
  const { incomeTax, accLevy, paye } = computePaye(gross, input.period, rates)
  const kiwiSaver = round2(gross * (input.kiwiSaverEmployeeRate ?? 0))
  const net = round2(gross - paye - kiwiSaver)
  return { hours: input.hours, rate: input.rate, gross, holidayPayComponent, incomeTax, accLevy, paye, kiwiSaver, net }
}
