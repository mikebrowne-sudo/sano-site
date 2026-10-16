// "Possibly already paid" — a warning on the pay approvals list.
//
// Before approving a cleaner's pay for a completed job, cross-check whether the
// same work has already been paid to someone: a live (non-void) pay approval
//   - on the SAME job by another contractor, or
//   - on another job at the SAME address within 3 weeks,
// whose hours are within ±1 of this job's hours. If this job has no hours set,
// any such match is flagged (we can't compare, so look first).
//
// Real cases: JOB-0233 (Lose unapproved; Kritika paid 3h on the same 2h job),
// JOB-0389 (a re-made copy of JOB-0322 — same quote/address, Kritika already
// paid 17h). It's a WARNING only — genuine extra visits do happen.

import type { SupabaseClient } from '@supabase/supabase-js'

export const ADDRESS_WINDOW_DAYS = 21
export const HOURS_TOLERANCE = 1

export interface ApprovalCandidate {
  jobId: string
  contractorId: string
  jobNumber: string
  address: string | null
  date: string | null // YYYY-MM-DD
  hours: number | null // this job's hours (allowed)
}

export interface PaidLine {
  invoiceNumber: string
  contractorId: string
  contractorName: string
  jobId: string
  jobNumber: string | null
  address: string | null
  date: string | null
  hours: number | null
  status: string
}

/** "Unit 2/2 Mountain View Rd, Western Springs" → "unit22mountainviewrd". */
export function addressKey(address: string | null | undefined): string {
  if (!address) return ''
  return address.split(',')[0].toLowerCase().replace(/[^a-z0-9]/g, '')
}

function daysApart(a: string, b: string): number {
  return Math.abs((Date.parse(a) - Date.parse(b)) / 86_400_000)
}

/** The warning for one approval row, or null. Pure. */
export function possiblyPaidNote(c: ApprovalCandidate, paid: PaidLine[]): string | null {
  const key = addressKey(c.address)
  const matches = paid.filter((p) => {
    if (p.jobId === c.jobId) return p.contractorId !== c.contractorId
    if (!key || addressKey(p.address) !== key) return false
    return !!c.date && !!p.date && daysApart(c.date, p.date) <= ADDRESS_WINDOW_DAYS
  })
  if (matches.length === 0) return null

  const withHours = matches.filter((m) => m.hours != null)
  if (c.hours != null) {
    // Compare against what's been paid: same job → everyone else's hours
    // together; same address → any one job that roughly matches.
    const sameJob = withHours.filter((m) => m.jobId === c.jobId)
    const sameJobTotal = sameJob.reduce((s, m) => s + (m.hours ?? 0), 0)
    const hit = (sameJob.length && Math.abs(sameJobTotal - c.hours) <= HOURS_TOLERANCE)
      ? sameJob
      : withHours.filter((m) => m.jobId !== c.jobId && Math.abs((m.hours ?? 0) - c.hours!) <= HOURS_TOLERANCE)
    if (hit.length === 0) return null
    return describe(hit, c)
  }
  // No hours on this job: any match is worth a look.
  return describe(matches, c)
}

function describe(ms: PaidLine[], c: ApprovalCandidate): string {
  const parts = ms.slice(0, 3).map((m) => {
    const where = m.jobId === c.jobId ? 'this job' : `${m.jobNumber ?? 'another job'}${m.date ? ` (${m.date})` : ''}, same address`
    return `${m.contractorName} ${m.invoiceNumber}${m.hours != null ? ` ${m.hours}h` : ''} on ${where}${m.status === 'paid' ? ', paid' : ''}`
  })
  return `Possibly already paid: ${parts.join('; ')}`
}

/** Load the live pay approvals that could overlap these rows, and the notes. */
export async function loadPossiblyPaid(
  supabase: SupabaseClient,
  rows: ApprovalCandidate[],
): Promise<Map<string, string>> {
  const out = new Map<string, string>()
  if (rows.length === 0) return out
  const dates = rows.map((r) => r.date).filter((d): d is string => !!d).sort()
  const from = dates.length ? new Date(Date.parse(dates[0]) - ADDRESS_WINDOW_DAYS * 86_400_000).toISOString().slice(0, 10) : '2000-01-01'

  // Two reads: anything on the same jobs (whatever their date — JOB-0233 has
  // none), plus anything at any address in the date window.
  const cols = 'id, invoice_number, contractor_id, status, pay_hours, job_id, contractors ( full_name ), jobs!inner ( job_number, address, scheduled_date )'
  const jobIds = Array.from(new Set(rows.map((r) => r.jobId)))
  const [{ data: sameJob }, { data: nearby }] = await Promise.all([
    supabase.from('contractor_invoices').select(cols).is('job_item_id', null).neq('status', 'void').in('job_id', jobIds),
    supabase.from('contractor_invoices').select(cols).is('job_item_id', null).neq('status', 'void').not('job_id', 'is', null).gte('jobs.scheduled_date', from),
  ])
  const seen = new Set<string>()
  const data = [...(sameJob ?? []), ...(nearby ?? [])].filter((r) => {
    const id = (r as { id: string }).id
    if (seen.has(id)) return false
    seen.add(id)
    return true
  })
  type Raw = {
    invoice_number: string | null; contractor_id: string; status: string; pay_hours: number | null; job_id: string
    contractors: { full_name: string | null } | { full_name: string | null }[] | null
    jobs: { job_number: string | null; address: string | null; scheduled_date: string | null } | { job_number: string | null; address: string | null; scheduled_date: string | null }[] | null
  }
  const one = <T,>(v: T | T[] | null): T | null => (Array.isArray(v) ? (v[0] ?? null) : v)
  const paid: PaidLine[] = (data as unknown as Raw[]).map((r) => {
    const j = one(r.jobs)
    return {
      invoiceNumber: r.invoice_number ?? 'a payable',
      contractorId: r.contractor_id,
      contractorName: one(r.contractors)?.full_name ?? 'Contractor',
      jobId: r.job_id,
      jobNumber: j?.job_number ?? null,
      address: j?.address ?? null,
      date: j?.scheduled_date ? String(j.scheduled_date).slice(0, 10) : null,
      hours: r.pay_hours == null ? null : Number(r.pay_hours),
      status: r.status,
    }
  })
  for (const r of rows) {
    const note = possiblyPaidNote(r, paid)
    if (note) out.set(`${r.jobId}::${r.contractorId}`, note)
  }
  return out
}
