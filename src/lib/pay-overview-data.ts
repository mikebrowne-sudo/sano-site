// Pay-area summary loaders (Phase 5) — read-only.
//
// Feeds the /portal/pay hub and the worker-level Pay views. Every figure comes
// from the CANONICAL model and is derived exactly the way the detail screens
// derive it, so the hub can never disagree with Contractor Pay or Payment
// History:
//   owed        contractor_invoices status='approved' minus anything already
//               on a remittance item — the same rule as the pay-run planner
//   payment     contractor_remittances + live (un-reversed) allocations — the
//               same four states as Payment History
//   employees   pay_runs / pay_run_lines / payslips
//
// Deliberately NOT used: contractor statements (retired), legacy contractor
// pay_runs / pay_run_items / pay_run_remittances (retired), employee_pay_runs
// (free-text legacy helper).
//
// Nothing here writes. Viewing a summary must never change payment state.
//
// Query shape: the hub needs counts and totals, not the grouped payee plan, so
// these run a handful of narrow selects rather than reusing the full
// previewRemittancesForContractors builder. Volumes are small (tens of
// remittances, ~100 payables) so in-JS aggregation is the simplest reliable
// approach and keeps the derivation identical to the detail screens.

import type { SupabaseClient } from '@supabase/supabase-js'
import type { PaymentState } from './contractor-remittance-data'

const round2 = (n: number) => Math.round(n * 100) / 100

export interface ContractorPayOverview {
  /** Approved, not-yet-remitted payables. */
  readyTotal: number
  payeeCount: number
  payItemCount: number
  /** Remittances stamped paid with no bank money matched at all. */
  awaitingBankCount: number
  awaitingBankTotal: number
  /** Remittances with SOME bank money matched, but not the full amount. */
  partlyConfirmedCount: number
  partlyConfirmedTotal: number
  confirmedCount: number
}

/**
 * Contractor side of the Pay hub. `readyTotal` here is the raw payable sum;
 * the pay-run screen groups it into payees (a shared-GST couple pays as one),
 * so payeeCount is a distinct-contractor count and may exceed the number of
 * remittances that would actually be created. Counted per contractor because
 * "how many people are owed money" is the operationally useful figure.
 */
export async function loadContractorPayOverview(supabase: SupabaseClient): Promise<ContractorPayOverview> {
  const [{ data: approved }, { data: remitItems }, { data: remittances }, { data: allocs }] = await Promise.all([
    supabase.from('contractor_invoices').select('id, contractor_id, amount').eq('status', 'approved'),
    supabase.from('contractor_remittance_items').select('contractor_invoice_id, remittance_id, amount').not('contractor_invoice_id', 'is', null),
    supabase.from('contractor_remittances').select('id, paid_at, payment_confirmed'),
    supabase.from('remittance_payment_allocations').select('remittance_id, amount_allocated').is('reversed_at', null),
  ])

  const remitted = new Set((remitItems ?? []).map((r) => r.contractor_invoice_id as string))
  const owed = ((approved ?? []) as Array<{ id: string; contractor_id: string | null; amount: number | null }>)
    .filter((ci) => !remitted.has(ci.id))

  const remittanceTotals = new Map<string, number>()
  for (const it of (remitItems ?? []) as Array<{ remittance_id: string; amount: number | null }>) {
    remittanceTotals.set(it.remittance_id, (remittanceTotals.get(it.remittance_id) ?? 0) + Number(it.amount ?? 0))
  }
  const allocated = new Map<string, number>()
  for (const a of (allocs ?? []) as Array<{ remittance_id: string; amount_allocated: number | null }>) {
    allocated.set(a.remittance_id, (allocated.get(a.remittance_id) ?? 0) + Number(a.amount_allocated ?? 0))
  }

  let awaitingBankCount = 0, awaitingBankTotal = 0
  let partlyConfirmedCount = 0, partlyConfirmedTotal = 0
  let confirmedCount = 0
  for (const r of (remittances ?? []) as Array<{ id: string; paid_at: string | null; payment_confirmed: boolean | null }>) {
    if (!r.paid_at) continue                       // open — not a payment yet
    const total = round2(remittanceTotals.get(r.id) ?? 0)
    if (r.payment_confirmed) { confirmedCount++; continue }
    const alloc = round2(allocated.get(r.id) ?? 0)
    if (alloc > 0) { partlyConfirmedCount++; partlyConfirmedTotal += total }
    else { awaitingBankCount++; awaitingBankTotal += total }
  }

  return {
    readyTotal: round2(owed.reduce((s, ci) => s + Number(ci.amount ?? 0), 0)),
    payeeCount: new Set(owed.map((ci) => ci.contractor_id).filter(Boolean)).size,
    payItemCount: owed.length,
    awaitingBankCount,
    awaitingBankTotal: round2(awaitingBankTotal),
    partlyConfirmedCount,
    partlyConfirmedTotal: round2(partlyConfirmedTotal),
    confirmedCount,
  }
}

export interface EmployeePayOverview {
  activeEmployees: number
  draftRunCount: number
  /** Most recent employee pay run (draft first, else latest by pay date). */
  latestRun: { id: string; payDate: string | null; status: string | null; lineCount: number; netTotal: number } | null
  unreimbursedMileage: number
}

/** Employee side of the Pay hub. Read-only; no payroll behaviour is touched. */
export async function loadEmployeePayOverview(supabase: SupabaseClient): Promise<EmployeePayOverview> {
  const [{ data: emps }, { data: runs }, { data: mileage }] = await Promise.all([
    supabase.from('contractors').select('id').eq('status', 'active').neq('worker_type', 'contractor'),
    supabase.from('pay_runs').select('id, pay_date, status, kind').or('kind.is.null,kind.eq.employee').order('pay_date', { ascending: false }),
    supabase.from('mileage_logs').select('id').neq('status', 'reimbursed'),
  ])

  const employeeRuns = (runs ?? []) as Array<{ id: string; pay_date: string | null; status: string | null }>
  const draft = employeeRuns.filter((r) => r.status === 'draft')
  // Prefer a draft (it's the actionable one), else the most recent run.
  const pick = draft[0] ?? employeeRuns[0] ?? null

  let latestRun: EmployeePayOverview['latestRun'] = null
  if (pick) {
    const { data: lines } = await supabase
      .from('pay_run_lines')
      .select('net_pay')
      .eq('pay_run_id', pick.id)
    const rows = (lines ?? []) as Array<{ net_pay: number | null }>
    latestRun = {
      id: pick.id,
      payDate: pick.pay_date,
      status: pick.status,
      lineCount: rows.length,
      netTotal: round2(rows.reduce((s, l) => s + Number(l.net_pay ?? 0), 0)),
    }
  }

  return {
    activeEmployees: (emps ?? []).length,
    draftRunCount: draft.length,
    latestRun,
    unreimbursedMileage: (mileage ?? []).length,
  }
}

// ── Worker-level ────────────────────────────────────────────────────────

export interface WorkerOwedLine {
  ciId: string
  invoiceNumber: string | null
  jobNumber: string | null
  jobAddress: string | null
  amount: number
}

export interface WorkerPaymentRow {
  remittanceId: string
  remittanceNumber: string
  paymentDate: string | null
  amount: number
  jobCount: number
  state: PaymentState
}

export interface ContractorWorkerPay {
  owedTotal: number
  owedLines: WorkerOwedLine[]
  payments: WorkerPaymentRow[]
  paidToDate: number
}

/**
 * One contractor's pay picture: what we owe them now, and what we've paid.
 *
 * History is read from the FROZEN remittance items (their snapshotted
 * contractor_name / job_number / amount), never re-derived from current
 * grouping rules — so a later change to how shared-GST couples are grouped
 * cannot rewrite what a past payment looked like. Amounts shown are this
 * contractor's share of each remittance, which is what "what did we pay this
 * person" means, even when the remittance was issued to a combined payee.
 */
export async function loadContractorWorkerPay(
  supabase: SupabaseClient,
  contractorId: string,
  contractorName: string | null,
): Promise<ContractorWorkerPay> {
  const [{ data: approved }, { data: mine }] = await Promise.all([
    supabase
      .from('contractor_invoices')
      .select('id, invoice_number, amount, job_id, jobs ( job_number, address )')
      .eq('contractor_id', contractorId)
      .eq('status', 'approved'),
    // Frozen items belonging to this contractor — matched by id where the link
    // survives, and by snapshotted name as a fallback for legacy rows.
    supabase
      .from('contractor_remittance_items')
      .select('remittance_id, contractor_id, contractor_name, amount, job_number, tax_status')
      .neq('tax_status', 'superseded'),
  ])

  const allItems = (mine ?? []) as Array<{
    remittance_id: string; contractor_id: string | null; contractor_name: string | null
    amount: number | null; job_number: string | null
  }>
  const remittedCiIds = new Set<string>()
  {
    const { data: links } = await supabase
      .from('contractor_remittance_items')
      .select('contractor_invoice_id')
      .not('contractor_invoice_id', 'is', null)
    for (const l of (links ?? []) as Array<{ contractor_invoice_id: string }>) remittedCiIds.add(l.contractor_invoice_id)
  }

  const flat = <T,>(v: T | T[] | null | undefined): T | null => (Array.isArray(v) ? (v[0] ?? null) : (v ?? null))
  const owedLines: WorkerOwedLine[] = ((approved ?? []) as Array<{
    id: string; invoice_number: string | null; amount: number | null; job_id: string | null; jobs: unknown
  }>)
    .filter((ci) => !remittedCiIds.has(ci.id))
    .map((ci) => {
      const job = flat(ci.jobs) as { job_number: string | null; address: string | null } | null
      return {
        ciId: ci.id,
        invoiceNumber: ci.invoice_number,
        jobNumber: job?.job_number ?? null,
        jobAddress: job?.address ?? null,
        amount: round2(Number(ci.amount ?? 0)),
      }
    })

  const name = (contractorName ?? '').trim().toLowerCase()
  const isMine = (it: { contractor_id: string | null; contractor_name: string | null }) =>
    it.contractor_id === contractorId ||
    (!it.contractor_id && !!name && (it.contractor_name ?? '').trim().toLowerCase() === name)

  const mineItems = allItems.filter(isMine)
  const byRemittance = new Map<string, { amount: number; jobs: Set<string> }>()
  for (const it of mineItems) {
    const cur = byRemittance.get(it.remittance_id) ?? { amount: 0, jobs: new Set<string>() }
    cur.amount += Number(it.amount ?? 0)
    if (it.job_number) cur.jobs.add(it.job_number)
    byRemittance.set(it.remittance_id, cur)
  }

  let payments: WorkerPaymentRow[] = []
  let paidToDate = 0
  if (byRemittance.size > 0) {
    const ids = Array.from(byRemittance.keys())
    const [{ data: heads }, { data: allocs }] = await Promise.all([
      supabase.from('contractor_remittances').select('id, remittance_number, payment_date, paid_at, payment_confirmed, created_at').in('id', ids),
      supabase.from('remittance_payment_allocations').select('remittance_id, amount_allocated').in('remittance_id', ids).is('reversed_at', null),
    ])
    const allocated = new Map<string, number>()
    for (const a of (allocs ?? []) as Array<{ remittance_id: string; amount_allocated: number | null }>) {
      allocated.set(a.remittance_id, (allocated.get(a.remittance_id) ?? 0) + Number(a.amount_allocated ?? 0))
    }
    payments = ((heads ?? []) as Array<{
      id: string; remittance_number: string; payment_date: string | null
      paid_at: string | null; payment_confirmed: boolean | null; created_at: string | null
    }>).map((h) => {
      const agg = byRemittance.get(h.id)!
      const state: PaymentState =
        !h.paid_at ? 'open'
        : h.payment_confirmed ? 'confirmed'
        : (allocated.get(h.id) ?? 0) > 0 ? 'partial'
        : 'paid'
      if (h.paid_at) paidToDate += agg.amount
      return {
        remittanceId: h.id,
        remittanceNumber: h.remittance_number,
        paymentDate: h.payment_date ?? h.created_at,
        amount: round2(agg.amount),
        jobCount: agg.jobs.size,
        state,
      }
    }).sort((a, b) => (b.paymentDate ?? '').localeCompare(a.paymentDate ?? ''))
  }

  return {
    owedTotal: round2(owedLines.reduce((s, l) => s + l.amount, 0)),
    owedLines,
    payments,
    paidToDate: round2(paidToDate),
  }
}

export interface EmployeeWorkerPay {
  hourlyRate: number | null
  standardHours: number | null
  payFrequency: string | null
  taxCode: string | null
  runs: Array<{
    runId: string; lineId: string; payDate: string | null; status: string | null
    gross: number; net: number; payslipId: string | null
  }>
}

/** One employee's pay picture. Read-only view over the existing payroll model. */
export async function loadEmployeeWorkerPay(
  supabase: SupabaseClient,
  contractorId: string,
): Promise<EmployeeWorkerPay> {
  const [{ data: profile }, { data: lines }] = await Promise.all([
    supabase.from('contractors').select('hourly_rate, standard_hours, pay_frequency, tax_code').eq('id', contractorId).maybeSingle(),
    supabase
      .from('pay_run_lines')
      .select('id, pay_run_id, gross_pay, net_pay, pay_runs ( pay_date, status )')
      .eq('contractor_id', contractorId),
  ])

  const flat = <T,>(v: T | T[] | null | undefined): T | null => (Array.isArray(v) ? (v[0] ?? null) : (v ?? null))
  const lineRows = (lines ?? []) as Array<{
    id: string; pay_run_id: string; gross_pay: number | null; net_pay: number | null; pay_runs: unknown
  }>

  let payslipByLine = new Map<string, string>()
  if (lineRows.length > 0) {
    const { data: slips } = await supabase
      .from('payslips')
      .select('id, pay_run_line_id')
      .in('pay_run_line_id', lineRows.map((l) => l.id))
      .eq('is_current', true)
    payslipByLine = new Map(((slips ?? []) as Array<{ id: string; pay_run_line_id: string }>)
      .map((s) => [s.pay_run_line_id, s.id]))
  }

  const runs = lineRows.map((l) => {
    const run = flat(l.pay_runs) as { pay_date: string | null; status: string | null } | null
    return {
      runId: l.pay_run_id,
      lineId: l.id,
      payDate: run?.pay_date ?? null,
      status: run?.status ?? null,
      gross: round2(Number(l.gross_pay ?? 0)),
      net: round2(Number(l.net_pay ?? 0)),
      payslipId: payslipByLine.get(l.id) ?? null,
    }
  }).sort((a, b) => (b.payDate ?? '').localeCompare(a.payDate ?? ''))

  const p = (profile ?? null) as { hourly_rate: number | null; standard_hours: number | null; pay_frequency: string | null; tax_code: string | null } | null
  return {
    hourlyRate: p?.hourly_rate ?? null,
    standardHours: p?.standard_hours ?? null,
    payFrequency: p?.pay_frequency ?? null,
    taxCode: p?.tax_code ?? null,
    runs,
  }
}
