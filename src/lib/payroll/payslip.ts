// Payslip computation — pure + testable.
//
// The agreed hourly rate is INCLUSIVE of 8% holiday pay (per the casual
// employment agreement), so gross = hours × rate and the holiday-pay component
// is identified WITHIN that gross (8/108) on the payslip — nothing added on
// top. PAYE is on the full gross. KiwiSaver is 0 when the employee has opted
// out.
//
// Employer KiwiSaver: when the employee is a member, the employer contributes
// (min 3.5% from 1 Apr 2026) and ESCT is withheld FROM that contribution and
// paid to IRD — so the employee's account receives the net. ESCT does not
// change the employee's take-home; it splits the employer contribution between
// IRD and the employee's KiwiSaver.

import { computePaye, periodsPerYear, type PayPeriod, type PayeRates, PAYE_RATES } from './paye'
import { computeEsct, type EsctRates, ESCT_RATES } from './esct'

const round2 = (n: number) => Math.round(n * 100) / 100

export interface PayslipInput {
  hours: number
  rate: number // inclusive of 8% holiday pay
  period: PayPeriod
  kiwiSaverEmployeeRate?: number // 0 when opted out
  /** Employer KiwiSaver contribution rate, e.g. 0.035. 0 when not a member. */
  employerKiwiSaverRate?: number
  /**
   * ESCT rate threshold amount (employee's prior-year gross salary/wages + gross
   * employer super). Resolution priority, applied by the caller:
   *   1. explicit per-employee override, else
   *   2. actual prior-tax-year total when a complete year exists, else
   *   3. annualise this run (default here, for new employees / no history).
   * When omitted, this function falls back to (3).
   */
  esctThresholdAmount?: number
  rates?: PayeRates
  esctRates?: EsctRates
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
  /** Gross employer KiwiSaver contribution (before ESCT). */
  employerKiwiSaver: number
  /** Flat ESCT rate applied to the employer contribution. */
  esctRate: number
  /** ESCT withheld from the employer contribution (paid to IRD). */
  esct: number
  /** Employer contribution reaching the employee's KiwiSaver (after ESCT). */
  employerKiwiSaverNet: number
}

export function computePayslip(input: PayslipInput): Payslip {
  const rates = input.rates ?? PAYE_RATES
  const esctRates = input.esctRates ?? ESCT_RATES
  const gross = round2((input.hours || 0) * (input.rate || 0))
  const holidayPayComponent = round2((gross * 8) / 108)
  const { incomeTax, accLevy, paye } = computePaye(gross, input.period, rates)
  const kiwiSaver = round2(gross * (input.kiwiSaverEmployeeRate ?? 0))
  const net = round2(gross - paye - kiwiSaver)

  // Employer KiwiSaver + ESCT
  const employerKiwiSaver = round2(gross * (input.employerKiwiSaverRate ?? 0))
  const n = periodsPerYear(input.period)
  const thresholdAmount = input.esctThresholdAmount ?? gross * n + employerKiwiSaver * n
  const esctSplit = computeEsct(employerKiwiSaver, thresholdAmount, esctRates)

  return {
    hours: input.hours,
    rate: input.rate,
    gross,
    holidayPayComponent,
    incomeTax,
    accLevy,
    paye,
    kiwiSaver,
    net,
    employerKiwiSaver,
    esctRate: esctSplit.rate,
    esct: esctSplit.esct,
    employerKiwiSaverNet: esctSplit.netContribution,
  }
}
