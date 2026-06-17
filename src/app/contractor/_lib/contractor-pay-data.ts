// Contractor pay statement data — server-only.
//
// Sourced from the CANONICAL payable model (contractor_invoices +
// contractor_remittances), NOT the retired job_workers / pay_run flow:
//   • PENDING — approved, unpaid contractor_invoices (the contractor's
//     committed but-not-yet-paid pay).
//   • PAID — paid contractor_invoices, grouped by the remittance batch
//     that paid them (opening that batch's document), PLUS any legacy
//     paid pay_run_items (retired flow, kept for historical totals only).
//
// Aggregation lives in the pure buildContractorPayData (testable); this
// function just fetches + normalises. Uses the service-role client scoped
// to the one contractor (the caller has already authorised it) because
// contractor_invoices / remittances / pay_runs aren't contractor-readable
// under RLS. A contractor only ever sees their own rows.

import { getServiceSupabase } from '@/lib/supabase-service'
import {
  buildContractorPayData,
  type ContractorPayData,
  type RawContractorInvoice,
  type RawRemittanceLink,
  type RawRemittance,
  type RawLegacyPayItem,
  type RawLegacyToken,
} from './contractor-pay-statement'

export type { ContractorPayData, PendingLine, PaidBatch } from './contractor-pay-statement'

function flattenOne<T>(rel: T | T[] | null | undefined): T | null {
  if (!rel) return null
  return Array.isArray(rel) ? (rel[0] ?? null) : rel
}

export async function loadContractorPayStatement(contractorId: string): Promise<ContractorPayData> {
  const svc = getServiceSupabase()

  // ── Canonical payables for this contractor ────────────────────────
  const { data: ciRaw } = await svc
    .from('contractor_invoices')
    .select(`
      id, amount, status, date_paid, date_submitted, job_id,
      jobs ( job_number, title, completed_at, deleted_at )
    `)
    .eq('contractor_id', contractorId)

  const cis: RawContractorInvoice[] = ((ciRaw ?? []) as unknown as Array<{
    id: string
    amount: number | null
    status: string | null
    date_paid: string | null
    date_submitted: string | null
    job_id: string | null
    jobs: { job_number: string | null; title: string | null; completed_at: string | null; deleted_at: string | null } | Array<{ job_number: string | null; title: string | null; completed_at: string | null; deleted_at: string | null }> | null
  }>).map((c) => {
    const j = flattenOne(c.jobs)
    return {
      id: c.id,
      amount: c.amount,
      status: c.status,
      date_paid: c.date_paid,
      date_submitted: c.date_submitted,
      jobId: c.job_id,
      jobNumber: j?.job_number ?? null,
      title: j?.title ?? null,
      jobCompletedAt: j?.completed_at ?? null,
      jobDeletedAt: j?.deleted_at ?? null,
    }
  })

  // Remittance links for the PAID CIs (group + document link only).
  const paidCiIds = cis.filter((c) => c.status === 'paid' || !!c.date_paid).map((c) => c.id)
  let remLinks: RawRemittanceLink[] = []
  let rems: RawRemittance[] = []
  if (paidCiIds.length > 0) {
    const { data: linkRaw } = await svc
      .from('contractor_remittance_items')
      .select('contractor_invoice_id, remittance_id')
      .in('contractor_invoice_id', paidCiIds)
    remLinks = ((linkRaw ?? []) as Array<{ contractor_invoice_id: string | null; remittance_id: string | null }>)
      .filter((l): l is { contractor_invoice_id: string; remittance_id: string } => !!l.contractor_invoice_id && !!l.remittance_id)
      .map((l) => ({ ciId: l.contractor_invoice_id, remittanceId: l.remittance_id }))

    const remIds = Array.from(new Set(remLinks.map((l) => l.remittanceId)))
    if (remIds.length > 0) {
      const { data: remRaw } = await svc
        .from('contractor_remittances')
        .select('id, token, payment_date')
        .in('id', remIds)
      rems = ((remRaw ?? []) as Array<{ id: string; token: string | null; payment_date: string | null }>)
        .map((r) => ({ id: r.id, token: r.token, paymentDate: r.payment_date }))
    }
  }

  // ── Legacy paid pay runs (retired flow, historical only) ──────────
  const { data: legacyRaw } = await svc
    .from('pay_run_items')
    .select('amount, pay_runs!inner ( id, pay_date, status, kind )')
    .eq('contractor_id', contractorId)
    .eq('status', 'paid')
  const legacyItems: RawLegacyPayItem[] = ((legacyRaw ?? []) as unknown as Array<{
    amount: number | null
    pay_runs: { id: string; pay_date: string | null; status: string | null; kind: string | null } | Array<{ id: string; pay_date: string | null; status: string | null; kind: string | null }> | null
  }>).flatMap((it) => {
    const run = flattenOne(it.pay_runs)
    if (!run) return []
    return [{ payRunId: run.id, payDate: run.pay_date, kind: run.kind, amount: it.amount }]
  })

  const { data: legacyTokRaw } = await svc
    .from('pay_run_remittances')
    .select('pay_run_id, token')
    .eq('contractor_id', contractorId)
  const legacyTokens: RawLegacyToken[] = ((legacyTokRaw ?? []) as Array<{ pay_run_id: string | null; token: string | null }>)
    .filter((r): r is { pay_run_id: string; token: string } => !!r.pay_run_id && !!r.token)
    .map((r) => ({ payRunId: r.pay_run_id, token: r.token }))

  return buildContractorPayData({ cis, remLinks, rems, legacyItems, legacyTokens })
}
