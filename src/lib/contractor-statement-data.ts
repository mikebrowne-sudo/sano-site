// Staff-only read helpers for contractor statements.
//
// Header totals (subtotal / gst_total / total_payable) are stored on the
// statement; the derived counts (lines, carried-forward, GST-review) are
// computed from the linked contractor_invoices so the staff views stay honest
// even if a header hasn't been refreshed.

import type { createClient } from './supabase-server'
import { resolveContractorServiceDate } from './contractor-service-date'
import { toNzCalendarDate } from './contractor-statement-period'
import { isCarriedForward, isGstReviewRequired } from './contractor-statement-build'

type Supabase = ReturnType<typeof createClient>

export interface StatementCardRow {
  id: string
  statement_number: string
  contractor_id: string
  contractor_name: string | null
  period_start: string
  period_end: string
  status: string
  viewed_at: string | null
  review_due_at: string | null
  confirmed_source: string | null
  subtotal: number
  gst_total: number
  total_payable: number
  line_count: number
  carried_lines: number
  gst_review_lines: number
}

export interface StatementLineRow {
  id: string
  invoice_number: string | null
  job_number: string | null
  service_date: string | null
  service_description: string | null
  site: string | null
  pay_hours: number | null
  pay_basis: string | null
  amount: number
  gst_status: string | null
  carried: boolean
}

export interface StatementDetail {
  id: string
  statement_number: string
  contractor_id: string
  contractor_name: string | null
  period_start: string
  period_end: string
  status: string
  subtotal: number
  gst_total: number
  total_payable: number
  created_at: string
  lines: StatementLineRow[]
}

interface LinkedCi {
  id: string
  invoice_number: string | null
  amount: number
  gst_status: string | null
  gst_amount: number | null
  job_id: string | null
  service_date: string | null
  gst_supply_date: string | null
  pay_hours: number | null
  pay_basis: string | null
  notes: string | null
  site_label: string | null
  statement_id: string
  jobs: { job_number: string | null; title: string | null; address: string | null; completed_at: string | null } | null
}

function resolvedDate(ci: LinkedCi): string | null {
  return resolveContractorServiceDate({
    job_id: ci.job_id,
    job_completed_at_nz: toNzCalendarDate(ci.jobs?.completed_at ?? null),
    service_date: ci.service_date,
    gst_supply_date: ci.gst_supply_date,
  }).date
}

/** Statement cards for a selected period, with derived counts. */
export async function listStatementsForPeriod(
  supabase: Supabase,
  period: { period_start: string; period_end: string },
): Promise<StatementCardRow[]> {
  const { data: statements } = await supabase
    .from('contractor_statements')
    .select('id, statement_number, contractor_id, period_start, period_end, status, viewed_at, review_due_at, confirmed_source, subtotal, gst_total, total_payable, contractors(full_name)')
    .eq('period_start', period.period_start)
    .eq('period_end', period.period_end)
    .order('statement_number')
  const list = (statements ?? []) as unknown as Array<StatementCardRow & { contractors: { full_name: string | null } | null }>
  if (list.length === 0) return []

  const ids = list.map((s) => s.id)
  const { data: cis } = await supabase
    .from('contractor_invoices')
    .select('id, amount, gst_status, gst_amount, job_id, service_date, gst_supply_date, statement_id, jobs(completed_at)')
    .in('statement_id', ids)
  const byStatement = new Map<string, LinkedCi[]>()
  for (const ci of (cis ?? []) as unknown as LinkedCi[]) {
    const arr = byStatement.get(ci.statement_id)
    if (arr) arr.push(ci)
    else byStatement.set(ci.statement_id, [ci])
  }

  return list.map((s) => {
    const lines = byStatement.get(s.id) ?? []
    return {
      id: s.id,
      statement_number: s.statement_number,
      contractor_id: s.contractor_id,
      contractor_name: s.contractors?.full_name ?? null,
      period_start: s.period_start,
      period_end: s.period_end,
      status: s.status,
      viewed_at: s.viewed_at,
      review_due_at: s.review_due_at,
      confirmed_source: s.confirmed_source,
      subtotal: Number(s.subtotal),
      gst_total: Number(s.gst_total),
      total_payable: Number(s.total_payable),
      line_count: lines.length,
      carried_lines: lines.filter((l) => {
        const d = resolvedDate(l)
        return d != null && isCarriedForward(d, s.period_start)
      }).length,
      gst_review_lines: lines.filter((l) => isGstReviewRequired(l.gst_status)).length,
    }
  })
}

/** One statement's header + read-only line detail. */
export async function getStatementDetail(supabase: Supabase, id: string): Promise<StatementDetail | null> {
  const { data: s } = await supabase
    .from('contractor_statements')
    .select('id, statement_number, contractor_id, period_start, period_end, status, subtotal, gst_total, total_payable, created_at, contractors(full_name)')
    .eq('id', id)
    .maybeSingle()
  if (!s) return null
  const header = s as unknown as StatementDetail & { contractors: { full_name: string | null } | null }

  const { data: cis } = await supabase
    .from('contractor_invoices')
    .select('id, invoice_number, amount, gst_status, gst_amount, job_id, service_date, gst_supply_date, pay_hours, pay_basis, notes, site_label, statement_id, jobs(job_number, title, address, completed_at)')
    .eq('statement_id', id)
  const lines = ((cis ?? []) as unknown as LinkedCi[])
    .map((ci): StatementLineRow => {
      const d = resolvedDate(ci)
      return {
        id: ci.id,
        invoice_number: ci.invoice_number,
        job_number: ci.jobs?.job_number ?? null,
        service_date: d,
        service_description: ci.jobs?.title ?? ci.notes ?? null,
        site: ci.jobs?.address ?? ci.site_label ?? null,
        pay_hours: ci.pay_hours == null ? null : Number(ci.pay_hours),
        pay_basis: ci.pay_basis,
        amount: Number(ci.amount),
        gst_status: ci.gst_status,
        carried: d != null && isCarriedForward(d, header.period_start),
      }
    })
    .sort((a, b) => (a.service_date ?? '').localeCompare(b.service_date ?? ''))

  return {
    id: header.id,
    statement_number: header.statement_number,
    contractor_id: header.contractor_id,
    contractor_name: header.contractors?.full_name ?? null,
    period_start: header.period_start,
    period_end: header.period_end,
    status: header.status,
    subtotal: Number(header.subtotal),
    gst_total: Number(header.gst_total),
    total_payable: Number(header.total_payable),
    created_at: header.created_at,
    lines,
  }
}
