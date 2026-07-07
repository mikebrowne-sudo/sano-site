// PAYE engine — pure + testable.
//
// ⚠️ VERIFY-GATED. The tax brackets and ACC earner levy below are a best-known
// snapshot, NOT authoritative. NZ income-tax thresholds and the ACC earner
// levy change (thresholds changed 31 July 2024; the levy rate rises most
// years). CONFIRM these against IRD / your accountant before running real pay,
// and update PAYE_RATES when they change. The UI shows a prominent banner.
//
// Method (approximation of IRD's PAYE): annualise the period's gross, apply the
// marginal income-tax brackets + the ACC earner levy (capped), then divide back
// to the pay period. Tax code M (main job, no student loan) — the only code we
// support for now.

export interface PayeRates {
  /** Human note shown in the verify banner. */
  effectiveNote: string
  /** Annual marginal brackets; `upTo: null` is the top band. */
  brackets: ReadonlyArray<{ upTo: number | null; rate: number }>
  /** ACC earner levy rate (e.g. 0.016 = 1.60%). */
  accEarnerLevyRate: number
  /** Max earnings the earner levy applies to. */
  accMaxEarnings: number
}

// PLACEHOLDER VALUES — verify before real pay.
export const PAYE_RATES: PayeRates = {
  effectiveNote:
    'Income-tax thresholds as at the 31 July 2024 changes; ACC earner levy placeholder. VERIFY current rates with your accountant / IRD before running real pay.',
  brackets: [
    { upTo: 15600, rate: 0.105 },
    { upTo: 53500, rate: 0.175 },
    { upTo: 78100, rate: 0.30 },
    { upTo: 180000, rate: 0.33 },
    { upTo: null, rate: 0.39 },
  ],
  accEarnerLevyRate: 0.016,
  accMaxEarnings: 142283,
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
  const accLevy = round2((Math.min(annual, rates.accMaxEarnings) * rates.accEarnerLevyRate) / n)
  return { incomeTax, accLevy, paye: round2(incomeTax + accLevy) }
}
