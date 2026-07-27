// Immutable payslip snapshot — everything needed to reproduce the official PDF
// WITHOUT reading mutable employee/employer/logo settings. Built once, when a run
// is paid, from the FROZEN approved figures + recorded payment metadata. The
// renderer reads only this. Pure + testable.

export const PAYSLIP_EMPLOYER = {
  legalName: 'Sano Property Services Limited',
  tradingName: 'Sano',
  address: '35 Holbrook Street, Blockhouse Bay, Auckland',
  logoRef: '/brand/sano-full-green.png', // retained approved logo (green on white)
  payrollEmail: 'hello@sano.nz',
} as const

const r2 = (n: number) => Math.round(Number(n || 0) * 100) / 100

/** Mask a bank account to its last 4 digits: '•••• 5550'. Empty → null. */
export function maskBankAccount(account: string | null | undefined): string | null {
  const digits = (account ?? '').replace(/\D/g, '')
  if (digits.length < 4) return account ? '•••• ' + digits : null
  return '•••• ' + digits.slice(-4)
}

/** Permanent, human-readable payslip reference. Deterministic given the inputs. */
export function payslipReference(payDate: string, seed: string): string {
  let h = 0
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0
  return `SANO-PS-${payDate}-${h.toString(16).toUpperCase().padStart(6, '0').slice(-6)}`
}

export interface EarningsLine { description: string; hours: number | null; rate: number | null; amount: number }

export interface PayslipSnapshot {
  reference: string
  version: number
  generatedAt: string
  employer: typeof PAYSLIP_EMPLOYER
  employee: { displayName: string; employeeId: string; maskedBankAccount: string | null }
  run: { payRunId: string; periodStart: string; periodEnd: string; payDate: string }
  payment: { paid: boolean; paymentDate: string | null; paymentMethod: string | null; paymentReference: string | null }
  earnings: { lines: EarningsLine[]; gross: number }
  deductions: { paye: number; employeeKsRate: number; employeeKsAmount: number; total: number; net: number }
  employerContributions: { ksRate: number; ksGross: number; esct: number | null; ksNet: number | null }
  termsSnapshot: unknown
}

export interface BuildSnapshotInput {
  reference: string
  version: number
  generatedAt: string
  employeeDisplayName: string
  employeeId: string
  bankAccount: string | null
  payRunId: string
  periodStart: string
  periodEnd: string
  payDate: string
  // Payment metadata (present once paid).
  paid: boolean
  paymentDate?: string | null
  paymentMethod?: string | null
  paymentReference?: string | null
  // Frozen line figures.
  hours: number
  rate: number
  gross: number
  paye: number
  employeeKsRate: number
  employeeKsAmount: number
  net: number
  employerKsRate: number
  employerKsGross: number
  esct: number | null
  employerKsNet: number | null
  termsSnapshot: unknown
}

export function buildPayslipSnapshot(i: BuildSnapshotInput): PayslipSnapshot {
  const paye = r2(i.paye)
  const employeeKsAmount = r2(i.employeeKsAmount)
  return {
    reference: i.reference,
    version: i.version,
    generatedAt: i.generatedAt,
    employer: PAYSLIP_EMPLOYER,
    employee: { displayName: i.employeeDisplayName, employeeId: i.employeeId, maskedBankAccount: maskBankAccount(i.bankAccount) },
    run: { payRunId: i.payRunId, periodStart: i.periodStart, periodEnd: i.periodEnd, payDate: i.payDate },
    payment: {
      paid: i.paid,
      paymentDate: i.paid ? (i.paymentDate ?? null) : null,
      paymentMethod: i.paid ? (i.paymentMethod ?? null) : null,
      paymentReference: i.paid ? (i.paymentReference ?? null) : null,
    },
    earnings: {
      lines: [{ description: 'Ordinary hours', hours: r2(i.hours), rate: r2(i.rate), amount: r2(i.gross) }],
      gross: r2(i.gross),
    },
    deductions: {
      paye,
      employeeKsRate: i.employeeKsRate,
      employeeKsAmount,
      total: r2(paye + employeeKsAmount),
      net: r2(i.net),
    },
    employerContributions: {
      ksRate: i.employerKsRate,
      ksGross: r2(i.employerKsGross),
      esct: i.esct == null ? null : r2(i.esct),
      ksNet: i.employerKsNet == null ? null : r2(i.employerKsNet),
    },
    termsSnapshot: i.termsSnapshot ?? null,
  }
}
