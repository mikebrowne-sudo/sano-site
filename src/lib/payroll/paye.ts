// PAYE engine — pure + testable. THE single source of PAYE truth for the
// portal: income-tax brackets + ACC earner levy live here only. Other
// callers (e.g. the pay-preview adapter in nz-paye.ts) delegate to this.
//
// Constants below are accountant-confirmed for the 2026/27 NZ tax year.
// They still change (thresholds + the ACC levy rate/cap move most years) —
// when they do, bump `taxYear`, update the values, and refresh the tests.
//
// Method (approximation of IRD's PAYE): annualise the period's gross, apply the
// marginal income-tax brackets + the ACC earner levy (capped), then divide back
// to the pay period. Tax code M (main job, no student loan) — the primary path
// this module models directly; secondary/SL/ND handling lives in the adapter.

export interface PayeRates {
  /** Tax year these constants apply to, e.g. '2026/27'. */
  taxYear: string
  /** Human note shown in the verify banner. */
  effectiveNote: string
  /** Annual marginal brackets; `upTo: null` is the top band. */
  brackets: ReadonlyArray<{ upTo: number | null; rate: number }>
  /** ACC earner levy rate (e.g. 0.0175 = 1.75%). */
  accEarnerLevyRate: number
  /** Max earnings the earner levy applies to. */
  accMaxEarnings: number
  /** Max annual earner levy (= accMaxEarnings × accEarnerLevyRate). */
  accMaxLevy: number
}

// Accountant-confirmed, 2026/27 NZ tax year.
export const PAYE_RATES: PayeRates = {
  taxYear: '2026/27',
  effectiveNote:
    'Accountant-confirmed rates for the 2026/27 NZ tax year (PAYE brackets + ACC earner levy 1.75%, cap $156,641 / max $2,741.22).',
  brackets: [
    { upTo: 15600, rate: 0.105 },
    { upTo: 53500, rate: 0.175 },
    { upTo: 78100, rate: 0.30 },
    { upTo: 180000, rate: 0.33 },
    { upTo: null, rate: 0.39 },
  ],
  accEarnerLevyRate: 0.0175,
  accMaxEarnings: 156641,
  accMaxLevy: 2741.22,
}

export type PayPeriod = 'weekly' | 'fortnightly' | 'monthly'

export function periodsPerYear(period: PayPeriod): number {
  return period === 'weekly' ? 52 : period === 'fortnightly' ? 26 : 12
}

const round2 = (n: number) => Math.round(n * 100) / 100

/** Annual income tax on `annualGross` using marginal brackets. */
export function annualIncomeTax(annualGross: number, brackets: PayeRates['brackets'] = PAYE_RATES.brackets): number {
  let tax = 0
  let lower = 0
  for (const b of brackets) {
    const upper = b.upTo ?? Infinity
    if (annualGross > lower) {
      tax += (Math.min(annualGross, upper) - lower) * b.rate
    }
    if (annualGross <= upper) break
    lower = upper
  }
  return tax
}

/** Annual ACC earner levy on `annualGross` (capped at the max earnings). */
export function annualAccLevy(annualGross: number, rates: PayeRates = PAYE_RATES): number {
  return Math.min(annualGross, rates.accMaxEarnings) * rates.accEarnerLevyRate
}

export interface PayeBreakdown {
  incomeTax: number
  accLevy: number
  paye: number
}

/** PAYE for one pay period's gross (income tax + ACC earner levy). */
export function computePaye(periodGross: number, period: PayPeriod, rates: PayeRates = PAYE_RATES): PayeBreakdown {
  const n = periodsPerYear(period)
  const annual = periodGross * n
  const incomeTax = round2(annualIncomeTax(annual, rates.brackets) / n)
  const accLevy = round2(annualAccLevy(annual, rates) / n)
  return { incomeTax, accLevy, paye: round2(incomeTax + accLevy) }
}
