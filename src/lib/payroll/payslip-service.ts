// Server helpers for official + preview payslips. The OFFICIAL payslip row (its
// immutable snapshot + permanent reference) is created only once its run is paid.
// A preview snapshot is built on the fly for an approved run and never stored.

import { buildPayslipSnapshot, payslipReference, type PayslipSnapshot } from '@/lib/payroll/payslip-snapshot'
import { employerKiwiSaverRate } from '@/lib/payroll/kiwisaver'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyClient = any

interface LineData {
  lineId: string
  runId: string
  status: string
  periodStart: string
  periodEnd: string
  payDate: string
  paymentDate: string | null
  paymentMethod: string | null
  paymentReference: string | null
  termsSnapshot: unknown
  contractorId: string
  employeeName: string
  bankAccount: string | null
  employeeKsRate: number
  employerKsRate: number
  hours: number
  rate: number
  gross: number
  paye: number
  employeeKs: number
  employerKsGross: number
  esct: number | null
  employerKsNet: number | null
  net: number
}

async function loadLineData(client: AnyClient, lineId: string): Promise<LineData | null> {
  const { data: line } = await client
    .from('pay_run_lines')
    .select('id, pay_run_id, contractor_id, hours_worked, hourly_rate, gross_pay, paye, kiwisaver_employee, kiwisaver_employer, kiwisaver_employer_net, esct, net_pay')
    .eq('id', lineId).maybeSingle()
  if (!line) return null
  const { data: run } = await client
    .from('pay_runs')
    .select('id, status, pay_period_start, pay_period_end, pay_date, payment_date, payment_method, payment_reference, terms_snapshot')
    .eq('id', line.pay_run_id).maybeSingle()
  if (!run) return null
  const { data: c } = await client
    .from('contractors')
    .select('id, full_name, preferred_name, bank_account_number, kiwisaver_employee_rate, kiwisaver_employer_rate')
    .eq('id', line.contractor_id).maybeSingle()
  return {
    lineId: line.id, runId: run.id, status: run.status,
    periodStart: run.pay_period_start, periodEnd: run.pay_period_end, payDate: run.pay_date,
    paymentDate: run.payment_date ?? null, paymentMethod: run.payment_method ?? null, paymentReference: run.payment_reference ?? null,
    termsSnapshot: run.terms_snapshot ?? null,
    contractorId: line.contractor_id,
    employeeName: (c?.preferred_name as string | null) || (c?.full_name as string | null) || 'Employee',
    bankAccount: (c?.bank_account_number as string | null) ?? null,
    employeeKsRate: Number(c?.kiwisaver_employee_rate ?? 3.5),
    employerKsRate: employerKiwiSaverRate(c?.kiwisaver_employer_rate),
    hours: Number(line.hours_worked ?? 0), rate: Number(line.hourly_rate ?? 0), gross: Number(line.gross_pay ?? 0),
    paye: Number(line.paye ?? 0), employeeKs: Number(line.kiwisaver_employee ?? 0),
    employerKsGross: Number(line.kiwisaver_employer ?? 0),
    esct: line.esct == null ? null : Number(line.esct), employerKsNet: line.kiwisaver_employer_net == null ? null : Number(line.kiwisaver_employer_net),
    net: Number(line.net_pay ?? 0),
  }
}

function snapshotFrom(d: LineData, meta: { reference: string; version: number; generatedAt: string; paid: boolean }): PayslipSnapshot {
  return buildPayslipSnapshot({
    reference: meta.reference, version: meta.version, generatedAt: meta.generatedAt,
    employeeDisplayName: d.employeeName, employeeId: d.contractorId, bankAccount: d.bankAccount,
    payRunId: d.runId, periodStart: d.periodStart, periodEnd: d.periodEnd, payDate: d.payDate,
    paid: meta.paid, paymentDate: d.paymentDate, paymentMethod: d.paymentMethod, paymentReference: d.paymentReference,
    hours: d.hours, rate: d.rate, gross: d.gross, paye: d.paye,
    employeeKsRate: d.employeeKsRate, employeeKsAmount: d.employeeKs, net: d.net,
    employerKsRate: d.employerKsRate, employerKsGross: d.employerKsGross, esct: d.esct, employerKsNet: d.employerKsNet,
    termsSnapshot: d.termsSnapshot,
  })
}

/** Preview snapshot for an approved (not-yet-paid) run — built fresh, never stored. */
export async function buildPreviewSnapshot(client: AnyClient, lineId: string): Promise<PayslipSnapshot | null> {
  const d = await loadLineData(client, lineId)
  if (!d) return null
  return snapshotFrom(d, { reference: 'PREVIEW', version: 0, generatedAt: new Date().toISOString(), paid: false })
}

/**
 * The current OFFICIAL payslip for a paid run's line, creating its immutable row
 * (snapshot + permanent reference, version 1, is_current) if it doesn't exist.
 * Returns null if the run isn't paid. Idempotent (partial-unique is_current).
 */
export async function ensureOfficialPayslip(client: AnyClient, lineId: string): Promise<{ id: string; snapshot: PayslipSnapshot; storagePath: string | null } | null> {
  const { data: existing } = await client
    .from('payslips').select('id, snapshot, storage_path').eq('pay_run_line_id', lineId).eq('is_current', true).maybeSingle()
  if (existing?.snapshot) return { id: existing.id, snapshot: existing.snapshot as PayslipSnapshot, storagePath: existing.storage_path ?? null }

  const d = await loadLineData(client, lineId)
  if (!d || d.status !== 'paid') return null
  const reference = payslipReference(d.payDate, lineId)
  const snapshot = snapshotFrom(d, { reference, version: 1, generatedAt: new Date().toISOString(), paid: true })

  // Upgrade an approval-shell row if present, else insert.
  const patch = { contractor_id: d.contractorId, pay_run_id: d.runId, reference, version: 1, is_current: true, snapshot, generated_at: snapshot.generatedAt }
  if (existing?.id) {
    await client.from('payslips').update(patch).eq('id', existing.id)
    return { id: existing.id, snapshot, storagePath: null }
  }
  const { data: created, error } = await client.from('payslips').insert({ pay_run_line_id: lineId, ...patch }).select('id').single()
  if (error || !created) return null
  return { id: created.id as string, snapshot, storagePath: null }
}
