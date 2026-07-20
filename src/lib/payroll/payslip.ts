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

/**
 * How 8% holiday pay is handled:
 * - 'inclusive'     — the hourly rate already includes 8% (gross = hours × rate;
 *                     the 8% is identified within, 8/108). Legacy default.
 * - 'exclusive_on_top' — the rate is the BASE; 8% is added on top as a separate
 *                     line (gross = base + 8%). Holidays-Act pay-as-you-go.
 */
export type HolidayPayMode = 'inclusive' | 'exclusive_on_top'

export interface PayslipInput {
  hours: number
  rate: number // base, or inclusive of 8% holiday pay — see holidayPayMode
  period: PayPeriod
  holidayPayMode?: HolidayPayMode // default 'inclusive'
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
  holidayPayMode: HolidayPayMode
  /** Base earnings before holiday pay (gross − holiday pay). */
  baseEarnings: number
  gross: number
  /**
   * The 8% holiday-pay amount. In 'inclusive' mode it's the portion within
   * gross (8/108); in 'exclusive_on_top' mode it's the 8% added on top.
   */
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
  const mode: HolidayPayMode = input.holidayPayMode ?? 'inclusive'

  // Holiday pay: either identified within the rate (inclusive, 8/108) or added
  // on top of a base rate (exclusive, 8%). PAYE is always on the full gross.
  const raw = round2((input.hours || 0) * (input.rate || 0))
  let baseEarnings: number
  let holidayPayComponent: number
  let gross: number
  if (mode === 'exclusive_on_top') {
    baseEarnings = raw
    holidayPayComponent = round2(raw * 0.08)
    gross = round2(raw + holidayPayComponent)
  } else {
    gross = raw
    holidayPayComponent = round2((raw * 8) / 108)
    baseEarnings = round2(raw - holidayPayComponent)
  }
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
    holidayPayMode: mode,
    baseEarnings,
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
