// Contractor completed-job history — grouped by month, with each job's pay
// status + a link to the remittance that paid it. Read-only record.
//
// Pure grouping (groupJobHistoryByMonth) is separated from the loader so it's
// trivially testable. Like the pay statement, this reads contractor_invoices /
// remittances via the service client scoped to ONE contractor, so a contractor
// only ever sees their own jobs.

import { getServiceSupabase } from '@/lib/supabase-service'
import { getContractorPayStatus, type ContractorPayStatus } from './contractor-pay-status'

export interface HistoryEntry {
  jobId: string
  jobNumber: string | null
  title: string | null
  address: string | null
  /** completed_at ?? scheduled_date — the date we group + sort on. */
  date: string | null
  payStatus: ContractorPayStatus
  amount: number | null
  /** Link to the remittance advice that paid this job, if any. */
  docHref: string | null
}

export interface HistoryMonth {
  key: string // 'YYYY-MM'
  label: string // 'June 2026'
  entries: HistoryEntry[]
  /** Sum of the entries' amounts (paid + pending). */
  total: number
}

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

const round2 = (n: number) => Math.round(n * 100) / 100

/** Group history entries into months, newest month first, newest job first.
 *  Dates are 'YYYY-MM-DD' strings — grouped by the literal year-month so
 *  there's no timezone drift. Undated entries fall into an 'Undated' bucket. */
export function groupJobHistoryByMonth(entries: HistoryEntry[]): HistoryMonth[] {
  const byKey = new Map<string, HistoryMonth>()
  for (const e of entries) {
    const key = e.date ? e.date.slice(0, 7) : 'undated'
    const label = e.date
      ? `${MONTHS[Number(key.slice(5, 7)) - 1] ?? '?'} ${key.slice(0, 4)}`
      : 'Undated'
    const m = byKey.get(key) ?? { key, label, entries: [], total: 0 }
    m.entries.push(e)
    m.total = round2(m.total + (e.amount ?? 0))
    byKey.set(key, m)
  }
  const months = Array.from(byKey.values())
  for (const m of months) {
    m.entries.sort((a, b) => (b.date ?? '').localeCompare(a.date ?? ''))
  }
  // Newest month first; 'undated' sorts last.
  months.sort((a, b) => {
    if (a.key === 'undated') return 1
    if (b.key === 'undated') return -1
    return b.key.localeCompare(a.key)
  })
  return months
}

function flattenOne<T>(rel: T | T[] | null | undefined): T | null {
  if (!rel) return null
  return Array.isArray(rel) ? (rel[0] ?? null) : rel
}

export async function loadContractorJobHistory(contractorId: string): Promise<HistoryMonth[]> {
  const svc = getServiceSupabase()

  // Completed / invoiced jobs for this contractor.
  const { data: jobsRaw } = await svc
    .from('jobs')
    .select('id, job_number, title, address, status, completed_at, scheduled_date, deleted_at')
    .eq('contractor_id', contractorId)
    .is('deleted_at', null)
    .in('status', ['completed', 'invoiced'])

  const jobs = (jobsRaw ?? []) as Array<{
    id: string
    job_number: string | null
    title: string | null
    address: string | null
    status: string | null
    completed_at: string | null
    scheduled_date: string | null
  }>
  if (jobs.length === 0) return []

  // This contractor's payables (one per job), excluding voids.
  const { data: ciRaw } = await svc
    .from('contractor_invoices')
    .select('id, job_id, status, date_paid, amount')
    .eq('contractor_id', contractorId)
    .neq('status', 'void')
  const cis = (ciRaw ?? []) as Array<{ id: string; job_id: string | null; status: string | null; date_paid: string | null; amount: number | null }>
  const ciByJob = new Map<string, { id: string; status: string | null; date_paid: string | null; amount: number | null }>()
  for (const c of cis) {
    if (c.job_id) ciByJob.set(c.job_id, { id: c.id, status: c.status, date_paid: c.date_paid, amount: c.amount })
  }

  // Remittance link + paid state + token for those payables.
  const ciIds = cis.map((c) => c.id)
  const remByCi = new Map<string, { token: string | null; paidAt: string | null }>()
  if (ciIds.length > 0) {
    const { data: linkRaw } = await svc
      .from('contractor_remittance_items')
      .select('contractor_invoice_id, contractor_remittances ( token, paid_at )')
      .in('contractor_invoice_id', ciIds)
    for (const l of (linkRaw ?? []) as Array<{ contractor_invoice_id: string | null; contractor_remittances: { token: string | null; paid_at: string | null } | { token: string | null; paid_at: string | null }[] | null }>) {
      if (!l.contractor_invoice_id) continue
      const rem = flattenOne(l.contractor_remittances)
      if (rem) remByCi.set(l.contractor_invoice_id, { token: rem.token, paidAt: rem.paid_at })
    }
  }

  const entries: HistoryEntry[] = jobs.map((j) => {
    const ci = ciByJob.get(j.id)
    const rem = ci ? remByCi.get(ci.id) : undefined
    const payStatus = getContractorPayStatus({
      jobStatus: j.status,
      jobCompletedAt: j.completed_at,
      invoiceStatus: ci?.status ?? null,
      invoiceDatePaid: ci?.date_paid ?? null,
      inPaidRemittance: !!rem?.paidAt,
    })
    return {
      jobId: j.id,
      jobNumber: j.job_number,
      title: j.title,
      address: j.address,
      date: j.completed_at ?? j.scheduled_date ?? null,
      payStatus,
      amount: ci?.amount ?? null,
      docHref: rem?.token ? `/remittance-batch/${rem.token}` : null,
    }
  })

  return groupJobHistoryByMonth(entries)
}
