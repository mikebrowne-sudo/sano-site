// The three distinct payroll obligations for a pay run, kept separate so no
// single "completed" status can imply they've all happened:
//   1. employee wage payment  (net_pay → the worker)
//   2. payday filing          (IR348 to IRD)
//   3. IRD remittance          (PAYE + KiwiSaver Sano owes IRD)
//
// This module computes obligation (3): the amount to set aside for IRD from a
// pay run's lines. Pure + testable. ESCT is INSIDE the gross employer KiwiSaver
// contribution and is shown for information only — it is NEVER added on top.

export interface PayrunLineAmounts {
  paye: number
  kiwisaverEmployee: number
  kiwisaverEmployerGross: number
  kiwisaverEmployerNet?: number | null
}

export interface IrdSetAside {
  paye: number
  employeeKs: number
  employerKsGross: number
  /** ESCT within the employer contribution (gross − net), or null if net unknown. */
  esct: number | null
  /** Total to set aside = PAYE + employee KiwiSaver + gross employer KiwiSaver. */
  total: number
}

const r2 = (n: number) => Math.round(n * 100) / 100

/**
 * Payday-filing due date — resolved from the payday, not hard-coded. Payday
 * filing is due within 2 working days of the pay date (electronic filers); this
 * returns pay_date + 2 working days (skipping Sat/Sun). 'YYYY-MM-DD' in/out.
 */
export function paydayFilingDue(payDate: string): string {
  const [y, m, d] = payDate.split('-').map(Number)
  let ms = Date.UTC(y, m - 1, d)
  let added = 0
  while (added < 2) {
    ms += 86_400_000
    const dow = new Date(ms).getUTCDay() // 0 Sun … 6 Sat
    if (dow !== 0 && dow !== 6) added++
  }
  return new Date(ms).toISOString().slice(0, 10)
}

/** Sum a pay run's lines into the IRD set-aside + breakdown. */
export function computeIrdSetAside(lines: PayrunLineAmounts[]): IrdSetAside {
  const paye = r2(lines.reduce((s, l) => s + (l.paye || 0), 0))
  const employeeKs = r2(lines.reduce((s, l) => s + (l.kiwisaverEmployee || 0), 0))
  const employerKsGross = r2(lines.reduce((s, l) => s + (l.kiwisaverEmployerGross || 0), 0))
  const hasNet = lines.every((l) => l.kiwisaverEmployerNet != null)
  const employerKsNet = hasNet ? r2(lines.reduce((s, l) => s + (l.kiwisaverEmployerNet || 0), 0)) : null
  const esct = employerKsNet == null ? null : r2(employerKsGross - employerKsNet)
  return {
    paye,
    employeeKs,
    employerKsGross,
    esct,
    total: r2(paye + employeeKs + employerKsGross),
  }
}
