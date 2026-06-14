// "Pay contractors" data — completed-but-unpaid contractor work, grouped
// by contractor, ready for one-click pay.
//
// In the allowed-hours model a completed job is payable the moment it's
// done (allowed hours + admin-approved extra × rate) — no separate
// "approve hours" step. A job is ELIGIBLE to pay when it's completed,
// not yet in a pay run / paid, and has both a rate and hours. Anything
// missing those is surfaced as "needs pricing" rather than a silent $0.

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
  needsPricing: boolean
  reason: string | null
}

export interface ToPayContractor {
  contractorId: string
  name: string
  email: string | null
  jobs: ToPayJob[]
  payableTotal: number
  payableCount: number
  needsPricingCount: number
}

export async function loadContractorsToPay(supabase: SupabaseClient): Promise<ToPayContractor[]> {
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

  for (const r of rows) {
    const j = r.jobs
    if (!j || j.deleted_at || !j.completed_at) continue // completed, live jobs only

    const rate = r.pay_rate ?? r.contractors?.hourly_rate ?? 0
    const allowed = r.hours_allocated ?? j.allowed_hours ?? 0
    const approvedExtra = r.extra_hours_status === 'approved' ? (r.extra_hours ?? 0) : 0
    const hours = Math.round((allowed + approvedExtra) * 100) / 100
    const amount = Math.round(hours * rate * 100) / 100

    const reason = rate <= 0 ? 'No pay rate set' : hours <= 0 ? 'No hours set' : null
    const needsPricing = reason != null

    const g = groups.get(r.contractor_id) ?? {
      contractorId: r.contractor_id,
      name: r.contractors?.full_name ?? 'Contractor',
      email: r.contractors?.email ?? null,
      jobs: [],
      payableTotal: 0,
      payableCount: 0,
      needsPricingCount: 0,
    }
    g.jobs.push({
      jobId: j.id,
      jobNumber: j.job_number ?? '—',
      address: j.address ?? null,
      jobDate: j.completed_at ?? j.scheduled_date ?? null,
      hours,
      rate,
      amount,
      needsPricing,
      reason,
    })
    if (needsPricing) g.needsPricingCount += 1
    else {
      g.payableTotal = Math.round((g.payableTotal + amount) * 100) / 100
      g.payableCount += 1
    }
    groups.set(r.contractor_id, g)
  }

  const out = Array.from(groups.values())
  out.forEach((g) => g.jobs.sort((a, b) => (a.jobDate ?? '').localeCompare(b.jobDate ?? '')))
  out.sort((a, b) => b.payableTotal - a.payableTotal)
  return out
}
