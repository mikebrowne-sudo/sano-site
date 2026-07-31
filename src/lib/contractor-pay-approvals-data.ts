// Shared loader for "jobs awaiting pay authorisation" — completed/invoiced jobs
// with an assigned contractor that have no approved payable yet. Used by the
// Pending Approvals worklist AND the Pay-run screen (with a period window), so
// the "what still needs authorising" list is computed one way.

import type { SupabaseClient } from '@supabase/supabase-js'
import { getWorkerPayableHours } from './job-cost'
import { classifyApprovalRow } from './pending-approvals'
import type { ApprovalRow } from '@/app/portal/contractor-invoices/pending-approvals/_components/PendingApprovalsList'

interface JWRow {
  contractor_id: string
  job_id: string
  pay_rate: number | null
  pay_type: string | null
  hours_allocated: number | null
  actual_hours: number | null
  extra_hours: number | null
  extra_hours_status: string | null
  contractors: { full_name: string | null; hourly_rate: number | null } | null
  jobs: {
    id: string; job_number: string | null; address: string | null; status: string | null
    completed_at: string | null; allowed_hours: number | null; description: string | null; deleted_at: string | null
  } | null
}

/**
 * Build the approval rows for completed/invoiced jobs, optionally bounded by
 * completion date [from, to] (inclusive, `YYYY-MM-DD`). Rows are classified the
 * same as the Pending Approvals page; action-needed rows sort first, newest
 * completion first. When `from`/`to` are given, only jobs completed in that
 * window are returned — the pay-run screen passes the selected pay period.
 */
export async function loadApprovalRows(
  supabase: SupabaseClient,
  opts: { from?: string | null; to?: string | null } = {},
): Promise<ApprovalRow[]> {
  const { data: jwRaw } = await supabase
    .from('job_workers')
    .select(`
      contractor_id, job_id, pay_rate, pay_type, hours_allocated, actual_hours, extra_hours, extra_hours_status,
      contractors ( full_name, hourly_rate ),
      jobs ( id, job_number, address, status, completed_at, allowed_hours, description, deleted_at )
    `)

  const all = (jwRaw ?? []) as unknown as JWRow[]
  let live = all.filter((r) => r.jobs && !r.jobs.deleted_at && (r.jobs.status === 'completed' || r.jobs.status === 'invoiced'))
  // Period window on the job completion date (the pay-run's completion basis).
  if (opts.from) live = live.filter((r) => (r.jobs!.completed_at ?? '').slice(0, 10) >= opts.from!)
  if (opts.to) live = live.filter((r) => (r.jobs!.completed_at ?? '').slice(0, 10) <= opts.to!)

  const workersPerJob = new Map<string, number>()
  for (const r of live) workersPerJob.set(r.job_id, (workersPerJob.get(r.job_id) ?? 0) + 1)

  const jobIds = Array.from(new Set(live.map((r) => r.job_id)))
  const { data: ciRaw } = jobIds.length > 0
    ? await supabase.from('contractor_invoices').select('id, invoice_number, status, job_id, contractor_id').in('job_id', jobIds).neq('status', 'void')
    : { data: [] as unknown[] }
  const ciByKey = new Map<string, { id: string; invoice_number: string | null; status: string | null }>()
  for (const ci of (ciRaw ?? []) as Array<{ id: string; invoice_number: string | null; status: string | null; job_id: string; contractor_id: string }>) {
    if (ci.job_id && ci.contractor_id) ciByKey.set(`${ci.job_id}::${ci.contractor_id}`, { id: ci.id, invoice_number: ci.invoice_number, status: ci.status })
  }

  const rows: ApprovalRow[] = live.map((r) => {
    const job = r.jobs!
    const rate = r.pay_rate ?? r.contractors?.hourly_rate ?? null
    const allowedHours = r.hours_allocated ?? job.allowed_hours ?? null
    const payableHours = getWorkerPayableHours({
      pay_rate: r.pay_rate, approved_hours: null, actual_hours: null,
      hours_allocated: r.hours_allocated, extra_hours: r.extra_hours, extra_hours_status: r.extra_hours_status,
    })
    const existingCI = ciByKey.get(`${r.job_id}::${r.contractor_id}`) ?? null
    const computed = classifyApprovalRow({
      payType: r.pay_type, rate, allowedHours, submittedHours: r.actual_hours,
      payableHours, hasExistingCI: !!existingCI, workersOnJob: workersPerJob.get(r.job_id) ?? 1,
    })
    return {
      jobId: r.job_id, contractorId: r.contractor_id, jobNumber: job.job_number ?? '—',
      jobAddress: job.address ?? null, completedAt: job.completed_at ?? null, jobStatus: job.status ?? null,
      contractorName: r.contractors?.full_name ?? 'Unknown', note: job.description?.trim() || null,
      allowedHours, submittedHours: r.actual_hours, defaultApprovedHours: payableHours, rate,
      mode: computed.mode, computedAmount: computed.computedAmount, flags: computed.flags,
      readiness: computed.readiness, existingCI,
    }
  })
  rows.sort((a, b) => {
    const aDone = a.readiness === 'already_approved' ? 1 : 0
    const bDone = b.readiness === 'already_approved' ? 1 : 0
    if (aDone !== bDone) return aDone - bDone
    return (b.completedAt ?? '').localeCompare(a.completedAt ?? '')
  })
  return rows
}

/** Just the rows still AWAITING authorisation (no approved payable yet). */
export function awaitingAuthorisation(rows: ApprovalRow[]): ApprovalRow[] {
  return rows.filter((r) => r.readiness !== 'already_approved')
}
