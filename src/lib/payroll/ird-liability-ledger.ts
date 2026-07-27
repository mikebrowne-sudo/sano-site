// Server helper: create the immutable IRD liability line for an approved pay run,
// attaching it to the correct IRD payment period. Idempotent (unique pay_run_id).
// Reads the run's FROZEN line figures — never recalculates the run. Takes the
// caller's Supabase client (service-role from the approve action).

import { irdPaymentPeriod, liabilityTotalForRun, deriveLiabilityStatus, liabilityOutstanding, type LiabilityStatus } from '@/lib/payroll/ird-liability'

export interface IrdPeriodView {
  id: string
  periodKey: string
  periodStart: string
  periodEnd: string
  dueDate: string
  totalPayable: number
  amountPaid: number
  adjustments: number
  outstanding: number
  status: LiabilityStatus
  paye: number
  employeeKs: number
  employerKsGross: number
  esct: number
  lineCount: number
  payRunIds: string[]
}

/** Load all IRD liability periods with computed money state. Best-effort. */
export async function loadIrdLiabilityPeriods(client: AnyClient, today: string): Promise<IrdPeriodView[]> {
  const { data: periods } = await client.from('ird_liabilities').select('id, period_key, period_start, period_end, due_date').order('period_key', { ascending: false })
  if (!periods?.length) return []
  const ids = (periods as Array<{ id: string }>).map((p) => p.id)
  const [{ data: lines }, { data: payments }, { data: adj }] = await Promise.all([
    client.from('ird_liability_lines').select('ird_liability_id, pay_run_id, paye, employee_ks, employer_ks_gross, esct, total_payable').in('ird_liability_id', ids),
    client.from('ird_liability_payments').select('ird_liability_id, amount').in('ird_liability_id', ids),
    client.from('ird_liability_adjustments').select('ird_liability_id, amount').in('ird_liability_id', ids),
  ])
  const sum = (arr: Array<Record<string, unknown>> | null, key: string, id: string) =>
    (arr ?? []).filter((r) => r.ird_liability_id === id).reduce((s, r) => s + Number((r[key] as number) || 0), 0)

  return (periods as Array<{ id: string; period_key: string; period_start: string; period_end: string; due_date: string }>).map((p) => {
    const periodLines = (lines ?? []).filter((l: Record<string, unknown>) => l.ird_liability_id === p.id)
    const totalPayable = round2(periodLines.reduce((s: number, l: Record<string, unknown>) => s + Number((l.total_payable as number) || 0), 0))
    const adjustments = round2(sum(adj as Array<Record<string, unknown>>, 'amount', p.id))
    const amountPaid = round2(sum(payments as Array<Record<string, unknown>>, 'amount', p.id))
    const netPayable = round2(totalPayable + adjustments)
    return {
      id: p.id, periodKey: p.period_key, periodStart: p.period_start, periodEnd: p.period_end, dueDate: p.due_date,
      totalPayable: netPayable, amountPaid, adjustments,
      outstanding: liabilityOutstanding(netPayable, amountPaid),
      status: deriveLiabilityStatus({ totalPayable: netPayable, amountPaid, dueDate: p.due_date, today, hasAdjustments: adjustments !== 0, periodClosed: true }),
      paye: round2(periodLines.reduce((s: number, l: Record<string, unknown>) => s + Number((l.paye as number) || 0), 0)),
      employeeKs: round2(periodLines.reduce((s: number, l: Record<string, unknown>) => s + Number((l.employee_ks as number) || 0), 0)),
      employerKsGross: round2(periodLines.reduce((s: number, l: Record<string, unknown>) => s + Number((l.employer_ks_gross as number) || 0), 0)),
      esct: round2(periodLines.reduce((s: number, l: Record<string, unknown>) => s + Number((l.esct as number) || 0), 0)),
      lineCount: periodLines.length,
      payRunIds: periodLines.map((l: Record<string, unknown>) => l.pay_run_id as string),
    }
  })
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyClient = any

/** Ensure an ird_liability_lines row exists for this approved run. Best-effort
 *  at the call site (the ledger tables depend on the PR C migration). */
export async function ensureLiabilityLineForRun(client: AnyClient, payRunId: string): Promise<{ created?: boolean; skipped?: string }> {
  // Already ledgered? (unique pay_run_id) — nothing to do.
  const { data: existing } = await client.from('ird_liability_lines').select('id').eq('pay_run_id', payRunId).maybeSingle()
  if (existing) return { skipped: 'already_ledgered' }

  const { data: run } = await client.from('pay_runs').select('id, pay_date, status').eq('id', payRunId).maybeSingle()
  if (!run || !['approved', 'paid'].includes(run.status)) return { skipped: 'not_approved' }

  // Sum the run's frozen lines.
  const { data: lines } = await client
    .from('pay_run_lines')
    .select('contractor_id, paye, kiwisaver_employee, kiwisaver_employer, kiwisaver_employer_net')
    .eq('pay_run_id', payRunId)
  const rows = (lines ?? []) as Array<{ contractor_id: string; paye: number; kiwisaver_employee: number; kiwisaver_employer: number; kiwisaver_employer_net: number | null }>
  if (rows.length === 0) return { skipped: 'no_lines' }

  const paye = round2(rows.reduce((s, l) => s + (l.paye || 0), 0))
  const employeeKs = round2(rows.reduce((s, l) => s + (l.kiwisaver_employee || 0), 0))
  const employerKsGross = round2(rows.reduce((s, l) => s + (l.kiwisaver_employer || 0), 0))
  const employerKsNet = rows.every((l) => l.kiwisaver_employer_net != null)
    ? round2(rows.reduce((s, l) => s + (l.kiwisaver_employer_net || 0), 0)) : null
  const { total, esct } = liabilityTotalForRun({ paye, employeeKs, employerKsGross, employerKsNet })
  const period = irdPaymentPeriod(run.pay_date as string)

  // Ensure the period exists.
  await client.from('ird_liabilities').upsert(
    { period_key: period.periodKey, period_start: period.periodStart, period_end: period.periodEnd, due_date: period.dueDate },
    { onConflict: 'period_key', ignoreDuplicates: true },
  )
  const { data: liab } = await client.from('ird_liabilities').select('id').eq('period_key', period.periodKey).maybeSingle()
  if (!liab) return { skipped: 'no_period' }

  const workerId = rows.length === 1 ? rows[0].contractor_id : null
  const { error } = await client.from('ird_liability_lines').insert({
    ird_liability_id: liab.id,
    pay_run_id: payRunId,
    worker_id: workerId,
    payday: run.pay_date,
    paye, employee_ks: employeeKs, employer_ks_gross: employerKsGross, esct, employer_ks_net: employerKsNet,
    total_payable: total,
    snapshot: { paye, employee_ks: employeeKs, employer_ks_gross: employerKsGross, esct, employer_ks_net: employerKsNet },
  })
  // Unique violation = a concurrent approval already ledgered it — fine.
  if (error && (error as { code?: string }).code !== '23505') return { skipped: error.message }
  return { created: true }
}

function round2(n: number) { return Math.round(n * 100) / 100 }
