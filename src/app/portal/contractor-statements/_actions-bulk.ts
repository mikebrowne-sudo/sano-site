'use server'

// Bulk-first contractor-statement workflow. Every bulk action:
//  • is admin-only
//  • processes each statement/remittance INDEPENDENTLY and atomically (per-item
//    RPC / action) so one failure never stops the rest
//  • returns a partial-success summary with per-item reasons
//  • has a matching dry-run preview that reruns the SAME eligibility checks
//
// One statement -> one unpaid remittance (via create_remittance_from_statement).
// The existing manual combined-household / adjustment builder is untouched.

import { createClient } from '@/lib/supabase-server'
import { isAdminUser } from '@/lib/is-admin'
import { revalidatePath } from 'next/cache'
import { isGstReviewRequired, isCarriedForward } from '@/lib/contractor-statement-build'
import { buildRemittanceReference } from '@/lib/remittance-reference'
import { issueContractorStatement } from './_actions-issue'
import { sendContractorRemittance } from '../contractor-invoices/_actions-send-remittance'

export interface Period { period_start: string; period_end: string }

function flatName(x: unknown): string | null {
  const v = Array.isArray(x) ? x[0] : x
  return (v as { full_name?: string | null } | null)?.full_name ?? null
}
export interface BulkItem { id: string; label: string; ok: boolean; reason?: string }
export interface BulkResult { ok?: true; error?: string; processed: number; skipped: number; needs_attention: number; items: BulkItem[] }

async function admin() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || !isAdminUser(user)) return { supabase, user: null }
  return { supabase, user }
}

// ── Issue all ────────────────────────────────────────────────────────────────

export interface IssuePreview { count: number; total: number; empty: number; gst_review_lines: number; carried_lines: number }

export async function previewIssueAll(period: Period): Promise<{ error?: string } & Partial<IssuePreview>> {
  const { supabase, user } = await admin()
  if (!user) return { error: 'Admin only.' }
  const { data: drafts } = await supabase
    .from('contractor_statements')
    .select('id, subtotal')
    .eq('period_start', period.period_start).eq('period_end', period.period_end).eq('status', 'draft')
  const ids = (drafts ?? []).map((d) => d.id as string)
  let empty = 0, gst_review = 0, total = 0
  if (ids.length) {
    const { data: cis } = await supabase
      .from('contractor_invoices')
      .select('statement_id, amount, gst_status, service_date, gst_supply_date, job_id, jobs(completed_at)')
      .in('statement_id', ids)
    const byStmt = new Map<string, number>()
    for (const ci of cis ?? []) {
      byStmt.set(ci.statement_id as string, (byStmt.get(ci.statement_id as string) ?? 0) + 1)
      total += Number(ci.amount)
      if (isGstReviewRequired(ci.gst_status as string | null)) gst_review++
    }
    empty = ids.filter((id) => !byStmt.get(id)).length
  }
  return { count: ids.length - empty, total: Math.round(total * 100) / 100, empty, gst_review_lines: gst_review, carried_lines: 0 }
}

export async function issueAllReadyStatements(period: Period): Promise<BulkResult> {
  const { supabase, user } = await admin()
  if (!user) return { error: 'Admin only.', processed: 0, skipped: 0, needs_attention: 0, items: [] }
  const { data: drafts } = await supabase
    .from('contractor_statements')
    .select('id, statement_number')
    .eq('period_start', period.period_start).eq('period_end', period.period_end).eq('status', 'draft')
  const items: BulkItem[] = []
  let processed = 0, attention = 0
  for (const d of drafts ?? []) {
    const res = await issueContractorStatement({ id: d.id as string })
    if (res.error) { attention++; items.push({ id: d.id as string, label: d.statement_number as string, ok: false, reason: res.error }) }
    else { processed++; items.push({ id: d.id as string, label: d.statement_number as string, ok: true, reason: res.emailSent ? undefined : 'issued, email not sent' }) }
  }
  revalidatePath('/portal/contractor-statements')
  return { ok: true, processed, skipped: 0, needs_attention: attention, items }
}

// ── Process ready payments ───────────────────────────────────────────────────

export interface PayPreviewItem { statement_number: string; contractor_name: string | null; total: number; ready: boolean; reason?: string }
export interface PayPreview {
  ready_count: number; ready_total: number; skip_count: number; needs_attention: number
  gst_review_lines: number; carried_lines: number; items: PayPreviewItem[]
}

async function candidateStatements(supabase: ReturnType<typeof createClient>, period: Period) {
  const { data } = await supabase
    .from('contractor_statements')
    .select('id, statement_number, contractor_id, period_start, issued_snapshot, contractors(full_name)')
    .eq('period_start', period.period_start).eq('period_end', period.period_end)
    .in('status', ['issued', 'confirmed'])
    .is('remittance_id', null)
  return data ?? []
}

export async function previewProcessPayments(period: Period): Promise<{ error?: string } & Partial<PayPreview>> {
  const { supabase, user } = await admin()
  if (!user) return { error: 'Admin only.' }
  const candidates = await candidateStatements(supabase, period)
  const items: PayPreviewItem[] = []
  let ready = 0, readyTotal = 0, skip = 0, gstReview = 0, carried = 0
  for (const s of candidates) {
    const { data: block } = await supabase.rpc('statement_payment_block', { p_statement_id: s.id })
    const snap = s.issued_snapshot as { total_payable?: number; gst_review_count?: number; lines?: Array<{ gst_status: string | null; service_date: string | null }> } | null
    const total = Number(snap?.total_payable ?? 0)
    if (block == null) {
      ready++; readyTotal += total
      gstReview += Number(snap?.gst_review_count ?? 0)
      carried += (snap?.lines ?? []).filter((l) => l.service_date && isCarriedForward(l.service_date, s.period_start as string)).length
      items.push({ statement_number: s.statement_number as string, contractor_name: flatName(s.contractors), total, ready: true })
    } else {
      skip++
      items.push({ statement_number: s.statement_number as string, contractor_name: flatName(s.contractors), total, ready: false, reason: block as string })
    }
  }
  return { ready_count: ready, ready_total: Math.round(readyTotal * 100) / 100, skip_count: skip, needs_attention: skip, gst_review_lines: gstReview, carried_lines: carried, items }
}

export async function processReadyPayments(period: Period, paymentDate: string): Promise<BulkResult> {
  const { supabase, user } = await admin()
  if (!user) return { error: 'Admin only.', processed: 0, skipped: 0, needs_attention: 0, items: [] }
  if (!paymentDate) return { error: 'A payment date is required.', processed: 0, skipped: 0, needs_attention: 0, items: [] }
  const candidates = await candidateStatements(supabase, period)
  const items: BulkItem[] = []
  let processed = 0, attention = 0
  for (const s of candidates) {
    const reference = buildRemittanceReference(flatName(s.contractors), paymentDate)
    const { data, error } = await supabase.rpc('create_remittance_from_statement', {
      p_statement_id: s.id, p_payment_date: paymentDate, p_reference: reference,
    })
    if (error) { attention++; items.push({ id: s.id as string, label: s.statement_number as string, ok: false, reason: error.message }) }
    else { processed++; items.push({ id: s.id as string, label: (data as { remittance_number?: string })?.remittance_number ?? (s.statement_number as string), ok: true }) }
  }
  revalidatePath('/portal/contractor-statements')
  revalidatePath('/portal/contractor-invoices')
  return { ok: true, processed, skipped: 0, needs_attention: attention, items }
}

// ── Mark selected remittances paid ───────────────────────────────────────────

export async function markRemittancesPaid(remittanceIds: string[], paymentDate: string): Promise<BulkResult> {
  const { supabase, user } = await admin()
  if (!user) return { error: 'Admin only.', processed: 0, skipped: 0, needs_attention: 0, items: [] }
  if (!paymentDate) return { error: 'A payment date is required.', processed: 0, skipped: 0, needs_attention: 0, items: [] }
  const items: BulkItem[] = []
  let processed = 0, attention = 0
  for (const id of Array.from(new Set(remittanceIds))) {
    const { data, error } = await supabase.rpc('mark_contractor_remittance_paid', { p_remittance_id: id, p_payment_date: paymentDate })
    if (error) { attention++; items.push({ id, label: id, ok: false, reason: error.message }) }
    else { processed++; items.push({ id, label: (data as { remittance_number?: string })?.remittance_number ?? id, ok: true }) }
  }
  revalidatePath('/portal/contractor-statements')
  revalidatePath('/portal/contractor-invoices')
  return { ok: true, processed, skipped: 0, needs_attention: attention, items }
}

// ── Send selected remittance advice (paid only, dup-guarded) ─────────────────

export async function sendRemittanceAdvice(remittanceIds: string[]): Promise<BulkResult> {
  const { supabase, user } = await admin()
  if (!user) return { error: 'Admin only.', processed: 0, skipped: 0, needs_attention: 0, items: [] }
  const ids = Array.from(new Set(remittanceIds))
  const { data: rems } = await supabase.from('contractor_remittances').select('id, remittance_number, paid_at, sent_at').in('id', ids)
  const byId = new Map((rems ?? []).map((r) => [r.id as string, r]))
  const items: BulkItem[] = []
  let processed = 0, skipped = 0, attention = 0
  for (const id of ids) {
    const r = byId.get(id)
    if (!r || !r.paid_at) { skipped++; items.push({ id, label: (r?.remittance_number as string) ?? id, ok: false, reason: 'not paid — advice not sent' }); continue }
    if (r.sent_at) { skipped++; items.push({ id, label: r.remittance_number as string, ok: false, reason: 'already sent' }); continue }
    const res = await sendContractorRemittance(id)
    if (res.error) { attention++; items.push({ id, label: r.remittance_number as string, ok: false, reason: res.error }) }
    else { processed++; items.push({ id, label: r.remittance_number as string, ok: true }) }
  }
  revalidatePath('/portal/contractor-statements')
  return { ok: true, processed, skipped, needs_attention: attention, items }
}
