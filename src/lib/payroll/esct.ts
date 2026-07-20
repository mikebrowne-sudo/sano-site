// ESCT — Employer Superannuation Contribution Tax.
//
// ESCT is tax on the EMPLOYER's KiwiSaver contribution. It's deducted FROM the
// employer contribution (not added on top): the employer pays the gross
// contribution amount, ESCT goes to IRD, and the remainder lands in the
// employee's KiwiSaver. So the employer's total cost is unchanged; what changes
// is how the contribution splits between IRD and the employee's account.
//
// The ESCT rate is a FLAT rate (not marginal) chosen by the band the employee's
// "ESCT rate threshold amount" falls into. Strictly that amount is the
// employee's prior-year gross salary/wages + gross employer contributions. For
// casual staff with no settled prior year we estimate it by annualising the
// current run (see payslip.ts) — the operator can override with a known figure.
//
// Constants are accountant-confirmed for the 2026/27 NZ tax year.

export interface EsctRates {
  taxYear: string
  /** Flat-rate bands by threshold amount; `upTo: null` is the top band. */
  bands: ReadonlyArray<{ upTo: number | null; rate: number }>
}

export const ESCT_RATES: EsctRates = {
  taxYear: '2026/27',
  bands: [
    { upTo: 18720, rate: 0.105 },
    { upTo: 64200, rate: 0.175 },
    { upTo: 93720, rate: 0.30 },
    { upTo: 216000, rate: 0.33 },
    { upTo: null, rate: 0.39 },
  ],
}

/**
 * Compulsory employer KiwiSaver contribution rate. Rose from 3% to 3.5% on
 * 1 April 2026 (continues to 4% on 1 April 2028). We're in the 2026/27 year.
 */
export const EMPLOYER_KIWISAVER_MIN_RATE = 0.035

const round2 = (n: number) => Math.round(n * 100) / 100

/** Flat ESCT rate for the band the threshold amount falls into. */
export function esctRate(thresholdAmount: number, rates: EsctRates = ESCT_RATES): number {
  for (const b of rates.bands) {
    if (b.upTo === null || thresholdAmount <= b.upTo) return b.rate
  }
  return rates.bands[rates.bands.length - 1].rate
}

export interface EsctBreakdown {
  /** The flat ESCT rate applied. */
  rate: number
  /** ESCT withheld from the employer contribution (paid to IRD). */
  esct: number
  /** Employer contribution that actually reaches the employee's KiwiSaver. */
  netContribution: number
}

/** Split a gross employer KiwiSaver contribution into ESCT + net contribution. */
export function computeEsct(
  employerContribution: number,
  thresholdAmount: number,
  rates: EsctRates = ESCT_RATES,
): EsctBreakdown {
  const rate = esctRate(thresholdAmount, rates)
  const esct = round2(employerContribution * rate)
  return { rate, esct, netContribution: round2(employerContribution - esct) }
}
