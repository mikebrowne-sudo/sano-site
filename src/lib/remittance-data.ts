// Remittance advice data — server-only.
//
// A remittance = a contractor's slice of a paid pay run. The header
// comes from pay_run_remittances + pay_runs; the lines derive live from
// pay_run_items joined to jobs (job #, address, date). Amounts are the
// total paid (hours × rate) — contractors handle their own GST/tax, so
// no GST breakdown.

import { getServiceSupabase } from './supabase-service'
import type { SupabaseClient } from '@supabase/supabase-js'

export interface RemittanceLine {
  jobNumber: string
  address: string | null
  jobDate: string | null
  hours: number
  amount: number
}

export interface RemittanceData {
  remittanceNumber: string
  payDate: string | null
  periodStart: string | null
  periodEnd: string | null
  contractorName: string
  contractorCompany: string | null
  lines: RemittanceLine[]
  total: number
  sentAt: string | null
}

interface ItemRow {
  approved_hours: number | null
  amount: number | null
  jobs: { job_number: string | null; address: string | null; scheduled_date: string | null } | null
}

async function build(
  svc: SupabaseClient,
  payRunId: string,
  contractorId: string,
  remittanceNumber: string,
  sentAt: string | null,
): Promise<RemittanceData | null> {
  const [{ data: run }, { data: contractor }, { data: itemsRaw }] = await Promise.all([
    svc.from('pay_runs').select('pay_date, pay_period_start, pay_period_end').eq('id', payRunId).maybeSingle(),
    svc.from('contractors').select('full_name, company_name').eq('id', contractorId).maybeSingle(),
    svc
      .from('pay_run_items')
      .select('approved_hours, amount, jobs ( job_number, address, scheduled_date )')
      .eq('pay_run_id', payRunId)
      .eq('contractor_id', contractorId),
  ])
  if (!run || !contractor) return null

  const items = (itemsRaw ?? []) as unknown as ItemRow[]
  const lines: RemittanceLine[] = items.map((it) => ({
    jobNumber: it.jobs?.job_number ?? '—',
    address: it.jobs?.address ?? null,
    jobDate: it.jobs?.scheduled_date ?? null,
    hours: it.approved_hours ?? 0,
    amount: it.amount ?? 0,
  }))
  lines.sort((a, b) => (a.jobDate ?? '').localeCompare(b.jobDate ?? ''))
  const total = Math.round(lines.reduce((s, l) => s + l.amount, 0) * 100) / 100

  return {
    remittanceNumber,
    payDate: (run.pay_date as string | null) ?? null,
    periodStart: (run.pay_period_start as string | null) ?? null,
    periodEnd: (run.pay_period_end as string | null) ?? null,
    contractorName: (contractor.full_name as string) ?? '—',
    contractorCompany: (contractor.company_name as string | null) ?? null,
    lines,
    total,
    sentAt,
  }
}

/** Resolve a remittance by its public token (render route / portal). */
export async function getRemittanceByToken(token: string): Promise<RemittanceData | null> {
  const svc = getServiceSupabase()
  const { data: rem } = await svc
    .from('pay_run_remittances')
    .select('pay_run_id, contractor_id, remittance_number, sent_at')
    .eq('token', token)
    .maybeSingle()
  if (!rem) return null
  return build(svc, rem.pay_run_id as string, rem.contractor_id as string, rem.remittance_number as string, (rem.sent_at as string | null) ?? null)
}

/** Build a remittance directly (used by the send action before a token round-trip). */
export async function getRemittanceFor(
  svc: SupabaseClient,
  payRunId: string,
  contractorId: string,
  remittanceNumber: string,
): Promise<RemittanceData | null> {
  return build(svc, payRunId, contractorId, remittanceNumber, null)
}
