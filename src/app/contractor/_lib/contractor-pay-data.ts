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
      jobs!inner ( id, job_number, title, status, completed_at, allowed_hours )
    `)
    .eq('contractor_id', contractorId)

  const rows = (rowsRaw ?? []) as unknown as RawRow[]

  const lines: PayLine[] = rows
    .filter((r) => r.jobs && (r.jobs.status === 'completed' || r.jobs.status === 'invoiced'))
    .filter((r) => !!r.jobs?.completed_at)
    .map((r) => {
      const j = r.jobs!
      const allowed = r.hours_allocated ?? j.allowed_hours ?? 0
      const approvedExtra = r.extra_hours_status === 'approved' ? (r.extra_hours ?? 0) : 0
      const hours = Math.round((allowed + approvedExtra) * 100) / 100
      const rate = r.pay_rate ?? fallbackRate
      return {
        jobId: j.id,
        jobNumber: j.job_number,
        title: j.title,
        completedAt: j.completed_at as string,
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
