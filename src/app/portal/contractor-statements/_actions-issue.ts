'use server'

// Issue a draft contractor statement to the contractor for review.
//
// Issuing: validates the draft, builds the IMMUTABLE issued snapshot, stamps
// issued_at/issued_by/review_due_at and flips status to 'issued' in one
// optimistic-locked update, audits, THEN emails the contractor. An email
// failure never reverts the issue — the statement stays issued and the staff
// UI shows "issued, email not sent" with a deliberate resend.
//
// Admin-only. No contractor writes. No confirmation/remittance here.

import { createClient } from '@/lib/supabase-server'
import { getServiceSupabase } from '@/lib/supabase-service'
import { isAdminUser } from '@/lib/is-admin'
import { revalidatePath } from 'next/cache'
import { Resend } from 'resend'
import { resolveContractorServiceDate } from '@/lib/contractor-service-date'
import { toNzCalendarDate } from '@/lib/contractor-statement-period'
import { resolveSupplierIdentity, buildIssuedSnapshot, type SnapshotLineInput, type IssuedSnapshot } from '@/lib/contractor-statement-snapshot'
import { resolveRemittanceLineTax, type ApprovedSnapshotForRemittance } from '@/lib/contractor-remittance-tax'

const DEFAULT_REVIEW_DAYS = 5

interface CiRow {
  id: string
  invoice_number: string | null
  contractor_id: string
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
  status: string
  jobs: { job_number: string | null; title: string | null; address: string | null; completed_at: string | null } | null
}

interface Contractor {
  id: string
  full_name: string | null
  email: string | null
  legal_name: string | null
  company_name: string | null
  business_structure: string | null
  tax_review_status: string | null
}

function escHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;')
}

function fmtNzDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-NZ', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Pacific/Auckland' })
}

async function sendIssueEmail(contractor: Contractor, snapshot: IssuedSnapshot, statementId: string): Promise<{ ok: boolean; error?: string }> {
  const svc = getServiceSupabase()
  const logBase = {
    type: 'contractor_statement_issued', channel: 'email' as const, audience: 'contractor' as const,
    recipient_name: contractor.full_name, recipient_email: contractor.email,
    related_contractor_id: contractor.id,
    payload: { statement_id: statementId, statement_number: snapshot.statement_number, review_due_at: snapshot.review_due_at },
  }
  const recipient = (contractor.email ?? '').trim()
  if (!recipient) {
    await svc.from('notification_logs').insert({ ...logBase, status: 'failed', error_message: 'No email on file for this contractor.' })
    return { ok: false, error: 'No email on file for this contractor.' }
  }

  const origin = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://sano.nz'
  const link = `${origin}/contractor/statements/${statementId}`
  const bodyLines = [
    `Hi ${(snapshot.contractor_contact_name || 'there').split(/\s+/)[0]},`,
    '',
    `Your contractor payment statement ${snapshot.statement_number} is ready to review.`,
    `Please review it by ${fmtNzDate(snapshot.review_due_at)} and let us know if anything is incorrect.`,
    '',
    `View your statement: ${link}`,
    '',
    'This is a contractor payment statement, not a tax invoice. Payment is not necessarily made on the issue date.',
    '',
    'If anything looks wrong, contact the Sano team before the review date.',
  ]
  const html = bodyLines.map((l) => (l === '' ? '' : `<p style="margin:0 0 10px;font-family:Inter,Arial,sans-serif;color:#3f4a3f;line-height:1.6">${escHtml(l)}</p>`)).join('')

  try {
    const resend = new Resend(process.env.RESEND_API_KEY)
    const { error } = await resend.emails.send({
      from: 'Sano <noreply@sano.nz>',
      replyTo: process.env.SANO_NOTIFY_EMAIL?.trim() || 'hello@sano.nz',
      to: recipient,
      subject: `Your Sano payment statement ${snapshot.statement_number} — ready to review`,
      html,
      text: bodyLines.join('\n'),
    })
    if (error) {
      await svc.from('notification_logs').insert({ ...logBase, status: 'failed', error_message: error.message })
      return { ok: false, error: error.message }
    }
    await svc.from('notification_logs').insert({ ...logBase, status: 'sent', sent_at: new Date().toISOString() })
    return { ok: true }
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Email send failed.'
    await svc.from('notification_logs').insert({ ...logBase, status: 'failed', error_message: msg })
    return { ok: false, error: msg }
  }
}

export interface IssueResult {
  error?: string
  issued?: boolean
  emailSent?: boolean
  emailError?: string
}

export async function issueContractorStatement(input: { id: string; review_due_at?: string }): Promise<IssueResult> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || !isAdminUser(user)) return { error: 'Admin only.' }

  const { data: stmt } = await supabase
    .from('contractor_statements')
    .select('id, statement_number, contractor_id, period_start, period_end, status')
    .eq('id', input.id)
    .maybeSingle()
  if (!stmt) return { error: 'Statement not found.' }
  if (stmt.status !== 'draft') return { error: `Only a draft statement can be issued (current: ${stmt.status}).` }

  const { data: c } = await supabase
    .from('contractors')
    .select('id, full_name, email, legal_name, company_name, business_structure, tax_review_status')
    .eq('id', stmt.contractor_id)
    .maybeSingle()
  if (!c) return { error: 'Contractor not found.' }
  const contractor = c as Contractor

  const { data: ciRows } = await supabase
    .from('contractor_invoices')
    .select('id, invoice_number, contractor_id, amount, gst_status, gst_amount, job_id, service_date, gst_supply_date, pay_hours, pay_basis, notes, site_label, status, jobs(job_number, title, address, completed_at)')
    .eq('statement_id', input.id)
  const cis = (ciRows ?? []) as unknown as CiRow[]
  if (cis.length === 0) return { error: 'Cannot issue an empty statement — it has no lines.' }

  // Re-validate every line still belongs on this statement.
  for (const ci of cis) {
    if (ci.contractor_id !== stmt.contractor_id) return { error: `${ci.invoice_number ?? 'A payable'} belongs to another contractor — refresh the draft.` }
    if (ci.status === 'paid' || ci.status === 'void') return { error: `${ci.invoice_number ?? 'A payable'} is ${ci.status} — refresh the draft before issuing.` }
  }
  const { data: remitted } = await supabase
    .from('contractor_remittance_items')
    .select('contractor_invoice_id')
    .in('contractor_invoice_id', cis.map((c2) => c2.id))
  const remittedSet = new Set((remitted ?? []).map((r) => r.contractor_invoice_id as string))
  const badRemit = cis.find((ci) => remittedSet.has(ci.id))
  if (badRemit) return { error: `${badRemit.invoice_number ?? 'A payable'} is already on a remittance — refresh the draft.` }

  // Snapshot the rate from job_workers.pay_rate (job-derived lines).
  const jobIds = cis.map((ci) => ci.job_id).filter((x): x is string => !!x)
  const rateByJob = new Map<string, number | null>()
  if (jobIds.length > 0) {
    const { data: jw } = await supabase
      .from('job_workers')
      .select('job_id, pay_rate')
      .eq('contractor_id', stmt.contractor_id)
      .in('job_id', jobIds)
    for (const w of (jw ?? []) as Array<{ job_id: string; pay_rate: number | null }>) rateByJob.set(w.job_id, w.pay_rate)
  }

  // Frozen schedular tax breakdown (PR 9): freeze from the contractor's APPROVED
  // payment tax snapshots, matched by supply date. Non-schedular lines stay
  // amount-only. Figures are copied from the snapshot, never recomputed.
  const { data: snapRaw } = await supabase
    .from('contractor_payment_tax_snapshots')
    .select('id, contractor_id, status, calc_status, supply_date, gross_ex_gst, gst_amount, withholding_rate, withholding_amount, net_bank, tax_declaration_id')
    .eq('status', 'approved')
    .eq('calc_status', 'ok')
    .eq('contractor_id', stmt.contractor_id)
  const approvedSnapshots: ApprovedSnapshotForRemittance[] = ((snapRaw ?? []) as Array<Record<string, unknown>>).map((s) => ({
    id: s.id as string,
    contractorId: s.contractor_id as string,
    status: s.status as string,
    calcStatus: s.calc_status as string,
    supplyDate: s.supply_date as string,
    grossExGst: s.gross_ex_gst == null ? null : Number(s.gross_ex_gst),
    gstAmount: s.gst_amount == null ? null : Number(s.gst_amount),
    withholdingRate: s.withholding_rate == null ? null : Number(s.withholding_rate),
    withholdingAmount: s.withholding_amount == null ? null : Number(s.withholding_amount),
    netBank: s.net_bank == null ? null : Number(s.net_bank),
    taxDeclarationId: (s.tax_declaration_id as string | null) ?? null,
  }))

  const lines: SnapshotLineInput[] = cis.map((ci) => {
    const service = resolveContractorServiceDate({
      job_id: ci.job_id,
      job_completed_at_nz: toNzCalendarDate(ci.jobs?.completed_at ?? null),
      service_date: ci.service_date,
      gst_supply_date: ci.gst_supply_date,
    }).date
    const taxR = resolveRemittanceLineTax(ci.contractor_id, service, approvedSnapshots)
    const tax = taxR.kind === 'frozen' ? taxR.tax : null
    return {
      contractor_invoice_id: ci.id,
      invoice_number: ci.invoice_number,
      job_number: ci.jobs?.job_number ?? null,
      service_date: service,
      description: ci.jobs?.title ?? ci.notes ?? null,
      site: ci.jobs?.address ?? ci.site_label ?? null,
      hours: ci.pay_hours == null ? null : Number(ci.pay_hours),
      rate: ci.job_id ? (rateByJob.get(ci.job_id) ?? null) : null,
      pay_basis: ci.pay_basis,
      amount: Number(ci.amount),
      gst_status: ci.gst_status,
      gst_amount: ci.gst_amount == null ? null : Number(ci.gst_amount),
      contractor_payment_snapshot_id: tax?.contractor_payment_snapshot_id ?? null,
      gross_ex_gst: tax?.gross_ex_gst ?? null,
      wht_rate: tax?.wht_rate ?? null,
      wht_amount: tax?.wht_amount ?? null,
      net_paid: tax?.net_paid ?? null,
      tax_declaration_id: tax?.tax_declaration_id ?? null,
    }
  })

  const supplier = resolveSupplierIdentity(contractor)
  const issuedAt = new Date().toISOString()
  const reviewDueAt = input.review_due_at || new Date(Date.now() + DEFAULT_REVIEW_DAYS * 86400000).toISOString()
  const snapshot = buildIssuedSnapshot({
    statement_number: stmt.statement_number,
    contractor_id: stmt.contractor_id,
    supplier,
    period_start: stmt.period_start,
    period_end: stmt.period_end,
    issued_at: issuedAt,
    review_due_at: reviewDueAt,
    lines,
  })

  // Optimistic-locked flip: only a still-draft row is issued.
  const { data: updated, error: updErr } = await supabase
    .from('contractor_statements')
    .update({ status: 'issued', issued_at: issuedAt, issued_by: user.id, review_due_at: reviewDueAt, issued_snapshot: snapshot, updated_at: issuedAt })
    .eq('id', input.id)
    .eq('status', 'draft')
    .select('id')
  if (updErr) return { error: `Could not issue: ${updErr.message}` }
  if (!updated || updated.length === 0) return { error: 'This statement was changed by someone else — reload and try again.' }

  await supabase.from('audit_log').insert({
    actor_id: user.id,
    actor_role: 'admin',
    action: 'contractor_statement.issued',
    entity_table: 'contractor_statements',
    entity_id: input.id,
    before: { status: 'draft' },
    after: {
      statement_number: stmt.statement_number,
      ci_ids: cis.map((ci) => ci.id),
      review_due_at: reviewDueAt,
      subtotal: snapshot.subtotal,
      gst_total: snapshot.gst_total,
      wht_total: snapshot.wht_total,
      total_payable: snapshot.total_payable,
    },
  })

  const emailResult = await sendIssueEmail(contractor, snapshot, input.id)
  revalidatePath('/portal/contractor-statements')
  revalidatePath(`/portal/contractor-statements/${input.id}`)
  return { issued: true, emailSent: emailResult.ok, emailError: emailResult.error }
}

/** Deliberate re-send of the issue email for an already-issued statement. */
export async function resendStatementIssueEmail(id: string): Promise<IssueResult> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || !isAdminUser(user)) return { error: 'Admin only.' }

  const { data: stmt } = await supabase
    .from('contractor_statements')
    .select('id, contractor_id, status, issued_snapshot')
    .eq('id', id)
    .maybeSingle()
  if (!stmt) return { error: 'Statement not found.' }
  if (!stmt.issued_snapshot || stmt.status === 'draft') return { error: 'This statement has not been issued yet.' }

  const { data: c } = await supabase
    .from('contractors')
    .select('id, full_name, email, legal_name, company_name, business_structure, tax_review_status')
    .eq('id', stmt.contractor_id)
    .maybeSingle()
  if (!c) return { error: 'Contractor not found.' }

  const result = await sendIssueEmail(c as Contractor, stmt.issued_snapshot as IssuedSnapshot, id)
  await supabase.from('audit_log').insert({
    actor_id: user.id,
    actor_role: 'admin',
    action: 'contractor_statement.issue_email_resent',
    entity_table: 'contractor_statements',
    entity_id: id,
    before: null,
    after: { sent: result.ok, error: result.error ?? null },
  })
  revalidatePath(`/portal/contractor-statements/${id}`)
  return { issued: true, emailSent: result.ok, emailError: result.error }
}
