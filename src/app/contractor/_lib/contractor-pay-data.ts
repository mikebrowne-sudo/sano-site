// Contractor pay-statement data loader.
//
// Shared by the live pay statement page (user-session client, RLS) and
// the staff "Preview as contractor" tool (service-role client) so the
// computed figures can never drift. Pay basis matches the rest of the
// system: (allowed hours + admin-approved extra) × snapshotted pay_rate,
// falling back to the contractor's current hourly rate for historical
// rows. No job price or margin is ever included.

import type { SupabaseClient } from '@supabase/supabase-js'
import { payPeriodForDate, type PayPeriod } from '@/lib/contractor-pay-period'

interface RawRow {
  hours_allocated: number | null
  extra_hours: number | null
  extra_hours_status: string | null
  pay_rate: number | null
  pay_status: string | null
  jobs: {
    id: string
    job_number: string | null
    title: string | null
    status: string | null
    completed_at: string | null
    scheduled_date: string | null
    created_at: string | null
    allowed_hours: number | null
  } | null
}

export interface PayLine {
  jobId: string
  jobNumber: string | null
  title: string | null
  completedAt: string
  hours: number
  amount: number
  payStatus: string
}

export interface PayPeriodGroup {
  period: PayPeriod
  lines: PayLine[]
  subtotal: number
}

export interface ContractorPayData {
  periods: PayPeriodGroup[]
  grandTotal: number
  upcomingTotal: number
  paidTotal: number
}

export async function loadContractorPayStatement(
  supabase: SupabaseClient,
  contractorId: string,
  fallbackRate: number,
): Promise<ContractorPayData> {
  const { data: rowsRaw } = await supabase
    .from('job_workers')
    .select(`
      hours_allocated, extra_hours, extra_hours_status, pay_rate, pay_status,
      jobs!inner ( id, job_number, title, status, completed_at, scheduled_date, created_at, allowed_hours )
    `)
    .eq('contractor_id', contractorId)

  const rows = (rowsRaw ?? []) as unknown as RawRow[]

  // A job appears on the pay statement as soon as it's INVOICED (the
  // work has been billed) — it no longer has to be separately "marked
  // complete" first. We also include anything the contractor is already
  // being paid for (in a pay run / paid) so paid work can never drop
  // off. Upcoming vs Paid is driven by pay_status below.
  const lines: PayLine[] = rows
    .filter((r) => {
      const j = r.jobs
      if (!j) return false
      const inPayFlow = r.pay_status === 'included_in_pay_run' || r.pay_status === 'paid'
      return j.status === 'invoiced' || inPayFlow
    })
    .map((r) => {
      const j = r.jobs!
      const allowed = r.hours_allocated ?? j.allowed_hours ?? 0
      const approvedExtra = r.extra_hours_status === 'approved' ? (r.extra_hours ?? 0) : 0
      const hours = Math.round((allowed + approvedExtra) * 100) / 100
      const rate = r.pay_rate ?? fallbackRate
      // Pay-period date: completion mark if present, else the booked
      // clean date, else created. Guarantees a date for bucketing even
      // on invoiced jobs that were never explicitly marked complete.
      const periodDate = j.completed_at ?? j.scheduled_date ?? (j.created_at as string)
      return {
        jobId: j.id,
        jobNumber: j.job_number,
        title: j.title,
        completedAt: periodDate,
        hours,
        amount: Math.round(hours * rate * 100) / 100,
        payStatus: r.pay_status ?? 'pending',
      }
    })

  const groups = new Map<string, PayPeriodGroup>()
  for (const line of lines) {
    const period = payPeriodForDate(line.completedAt)
    const g = groups.get(period.payDate) ?? { period, lines: [], subtotal: 0 }
    g.lines.push(line)
    g.subtotal = Math.round((g.subtotal + line.amount) * 100) / 100
    groups.set(period.payDate, g)
  }
  const periods = Array.from(groups.values()).sort((a, b) => b.period.payDate.localeCompare(a.period.payDate))
  periods.forEach((g) => g.lines.sort((a, b) => b.completedAt.localeCompare(a.completedAt)))

  const grandTotal = Math.round(lines.reduce((s, l) => s + l.amount, 0) * 100) / 100
  const upcomingTotal = Math.round(
    lines.filter((l) => l.payStatus !== 'paid').reduce((s, l) => s + l.amount, 0) * 100,
  ) / 100
  const paidTotal = Math.round((grandTotal - upcomingTotal) * 100) / 100

  return { periods, grandTotal, upcomingTotal, paidTotal }
}
