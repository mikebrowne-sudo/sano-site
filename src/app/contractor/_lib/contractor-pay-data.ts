// Contractor pay statement data — server-only.
//
// Two parts:
//   • UPCOMING — completed, unpaid, PRICED jobs (allowed + approved
//     adjustment × rate). Unpriced/$0 jobs are hidden from the
//     contractor (staff fix or exclude them in the Tidy-up section).
//   • PAID — a collapsed summary per PAY RUN (pay date + total), each
//     opening its remittance document for the per-job detail.
//
// Uses the service-role client scoped to the one contractor: the paid
// history comes from pay_run_items / pay_runs, which contractors can't
// read under RLS. Safe because the caller supplies a contractor id it
// has already authorised (the signed-in contractor, or staff in the
// preview).

import { getServiceSupabase } from '@/lib/supabase-service'

interface UpcomingRaw {
  hours_allocated: number | null
  extra_hours: number | null
  extra_hours_status: string | null
  pay_rate: number | null
  jobs: {
    id: string
    job_number: string | null
    title: string | null
    status: string | null
    completed_at: string | null
    scheduled_date: string | null
    allowed_hours: number | null
    deleted_at: string | null
  } | null
}

export interface UpcomingLine {
  jobId: string
  jobNumber: string | null
  title: string | null
  date: string
  hours: number
  amount: number
}

export interface PaidRun {
  payRunId: string
  payDate: string | null
  periodStart: string | null
  periodEnd: string | null
  total: number
  jobCount: number
  remittanceToken: string | null
}

export interface ContractorPayData {
  upcoming: UpcomingLine[]
  upcomingTotal: number
  paidRuns: PaidRun[]
  paidTotal: number
}

export async function loadContractorPayStatement(contractorId: string): Promise<ContractorPayData> {
  const svc = getServiceSupabase()
  const todayNZ = new Date().toLocaleDateString('en-CA', { timeZone: 'Pacific/Auckland' })

  const { data: contractor } = await svc
    .from('contractors')
    .select('hourly_rate')
    .eq('id', contractorId)
    .maybeSingle()
  const fallbackRate = (contractor?.hourly_rate as number | null) ?? 0

  // ── Upcoming: completed, unpaid, priced jobs ──────────────────────
  const { data: jwRaw } = await svc
    .from('job_workers')
    .select(`
      hours_allocated, extra_hours, extra_hours_status, pay_rate,
      jobs!inner ( id, job_number, title, status, completed_at, scheduled_date, allowed_hours, deleted_at )
    `)
    .eq('contractor_id', contractorId)
    .neq('pay_status', 'paid')

  const upcoming: UpcomingLine[] = []
  for (const r of (jwRaw ?? []) as unknown as UpcomingRaw[]) {
    const j = r.jobs
    if (!j || j.deleted_at || !j.completed_at) continue
    if (j.scheduled_date && j.scheduled_date > todayNZ) continue // not happened yet (prepaid)
    const rate = r.pay_rate ?? fallbackRate
    const allowed = r.hours_allocated ?? j.allowed_hours ?? 0
    const approvedAdj = r.extra_hours_status === 'approved' ? (r.extra_hours ?? 0) : 0
    const hours = Math.round((allowed + approvedAdj) * 100) / 100
    const amount = Math.round(hours * rate * 100) / 100
    if (amount <= 0) continue // hide unpriced/$0 — handled in staff Tidy-up
    upcoming.push({
      jobId: j.id,
      jobNumber: j.job_number,
      title: j.title,
      date: j.completed_at,
      hours,
      amount,
    })
  }
  upcoming.sort((a, b) => b.date.localeCompare(a.date))
  const upcomingTotal = Math.round(upcoming.reduce((s, l) => s + l.amount, 0) * 100) / 100

  // ── Paid: one summary row per paid contractor pay run ─────────────
  const { data: itemsRaw } = await svc
    .from('pay_run_items')
    .select('amount, pay_runs!inner ( id, pay_date, pay_period_start, pay_period_end, status, kind )')
    .eq('contractor_id', contractorId)
    .eq('status', 'paid')

  const { data: remsRaw } = await svc
    .from('pay_run_remittances')
    .select('pay_run_id, token')
    .eq('contractor_id', contractorId)
  const tokenByRun = new Map<string, string>()
  for (const r of remsRaw ?? []) tokenByRun.set(r.pay_run_id as string, r.token as string)

  const runMap = new Map<string, PaidRun>()
  for (const it of (itemsRaw ?? []) as unknown as Array<{ amount: number | null; pay_runs: { id: string; pay_date: string | null; pay_period_start: string | null; pay_period_end: string | null; kind: string | null } | null }>) {
    const run = it.pay_runs
    if (!run || run.kind !== 'contractor') continue
    const g = runMap.get(run.id) ?? {
      payRunId: run.id,
      payDate: run.pay_date ?? null,
      periodStart: run.pay_period_start ?? null,
      periodEnd: run.pay_period_end ?? null,
      total: 0,
      jobCount: 0,
      remittanceToken: tokenByRun.get(run.id) ?? null,
    }
    g.total = Math.round((g.total + (it.amount ?? 0)) * 100) / 100
    g.jobCount += 1
    runMap.set(run.id, g)
  }
  const paidRuns = Array.from(runMap.values()).sort((a, b) => (b.payDate ?? '').localeCompare(a.payDate ?? ''))
  const paidTotal = Math.round(paidRuns.reduce((s, r) => s + r.total, 0) * 100) / 100

  return { upcoming, upcomingTotal, paidRuns, paidTotal }
}
