// "Pay contractors" data — completed-but-unpaid contractor work.
//
// Splits into two:
//   • contractors[] — each with their PAYABLE jobs (priced) + total,
//     ready for one-click pay.
//   • needsTidying[] — a flat list of completed jobs that can't be paid
//     yet (no rate / no hours). Staff fix or exclude these in the
//     Tidy-up section. Excluded rows (pay_status='excluded') drop out
//     entirely.
//
// A completed job is payable the moment it's done (allowed hours +
// approved adjustment × rate) — no separate approve-hours step.

import type { SupabaseClient } from '@supabase/supabase-js'

interface Row {
  contractor_id: string
  pay_rate: number | null
  hours_allocated: number | null
  extra_hours: number | null
  extra_hours_status: string | null
  pay_status: string | null
  contractors: { full_name: string | null; email: string | null; hourly_rate: number | null } | null
  jobs: {
    id: string
    job_number: string | null
    address: string | null
    scheduled_date: string | null
    completed_at: string | null
    allowed_hours: number | null
    deleted_at: string | null
  } | null
}

export interface ToPayJob {
  jobId: string
  jobNumber: string
  address: string | null
  jobDate: string | null
  hours: number
  rate: number
  amount: number
}

export interface ToPayContractor {
  contractorId: string
  name: string
  email: string | null
  jobs: ToPayJob[]
  payableTotal: number
  payableCount: number
}

export interface TidyJob {
  jobId: string
  jobNumber: string
  contractorId: string
  contractorName: string
  reason: string
}

export interface ToPayResult {
  contractors: ToPayContractor[]
  needsTidying: TidyJob[]
}

export async function loadContractorsToPay(supabase: SupabaseClient): Promise<ToPayResult> {
  const { data: rowsRaw } = await supabase
    .from('job_workers')
    .select(`
      contractor_id, pay_rate, hours_allocated, extra_hours, extra_hours_status, pay_status,
      contractors ( full_name, email, hourly_rate ),
      jobs!inner ( id, job_number, address, scheduled_date, completed_at, allowed_hours, deleted_at )
    `)
    .in('pay_status', ['pending', 'approved'])

  const rows = (rowsRaw ?? []) as unknown as Row[]
  const groups = new Map<string, ToPayContractor>()
  const needsTidying: TidyJob[] = []

  for (const r of rows) {
    const j = r.jobs
    if (!j || j.deleted_at || !j.completed_at) continue // completed, live jobs only

    const rate = r.pay_rate ?? r.contractors?.hourly_rate ?? 0
    const allowed = r.hours_allocated ?? j.allowed_hours ?? 0
    const approvedAdj = r.extra_hours_status === 'approved' ? (r.extra_hours ?? 0) : 0
    const hours = Math.round((allowed + approvedAdj) * 100) / 100
    const reason = rate <= 0 ? 'No pay rate set' : hours <= 0 ? 'No hours set' : null

    if (reason) {
      needsTidying.push({
        jobId: j.id,
        jobNumber: j.job_number ?? '—',
        contractorId: r.contractor_id,
        contractorName: r.contractors?.full_name ?? 'Contractor',
        reason,
      })
      continue
    }

    const amount = Math.round(hours * rate * 100) / 100
    const g = groups.get(r.contractor_id) ?? {
      contractorId: r.contractor_id,
      name: r.contractors?.full_name ?? 'Contractor',
      email: r.contractors?.email ?? null,
      jobs: [],
      payableTotal: 0,
      payableCount: 0,
    }
    g.jobs.push({
      jobId: j.id,
      jobNumber: j.job_number ?? '—',
      address: j.address ?? null,
      jobDate: j.completed_at ?? j.scheduled_date ?? null,
      hours,
      rate,
      amount,
    })
    g.payableTotal = Math.round((g.payableTotal + amount) * 100) / 100
    g.payableCount += 1
    groups.set(r.contractor_id, g)
  }

  const contractors = Array.from(groups.values())
  contractors.forEach((g) => g.jobs.sort((a, b) => (a.jobDate ?? '').localeCompare(b.jobDate ?? '')))
  contractors.sort((a, b) => b.payableTotal - a.payableTotal)
  needsTidying.sort((a, b) => a.contractorName.localeCompare(b.contractorName))

  return { contractors, needsTidying }
}
