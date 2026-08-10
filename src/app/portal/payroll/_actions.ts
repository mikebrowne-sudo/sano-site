'use server'

import { createClient } from '@/lib/supabase-server'
import { createEmployeePayRun } from '@/lib/payroll/create-employee-pay-run'
import { isAdminUser } from '@/lib/is-admin'
import { canTransitionPayment, validatePaymentDetails, markPaidPatch } from '@/lib/payroll/pay-run-lifecycle'
import { ensureLiabilityLineForRun } from '@/lib/payroll/ird-liability-ledger'
import { renderAndStoreOfficialPayslip } from '@/lib/payroll/payslip-generate'
import { Resend } from 'resend'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'

export async function createPayRun(input: { pay_period_start: string; pay_period_end: string; pay_date: string; pay_frequency: 'weekly' | 'fortnightly'; notes?: string; mileage_only?: boolean; mileage_from_prior_week?: boolean }) {
  // The manual run shares its logic with the weekly auto-draft cron.
  const res = await createEmployeePayRun(createClient(), input)
  if (res.error) return { error: res.error }
  redirect(`/portal/payroll/${res.id}`)
}

/** Live preview: approved, unpaid mileage for active employees dated within a
 *  period — so the New Pay Run form can show what a (catch-up) run will pay
 *  before it's created. */
export interface UnapprovedMileageEntry {
  id: string
  logDate: string
  personLabel: string | null
  distanceKm: number | null
  amount: number
}

/**
 * List DRAFT (unapproved) mileage in a period so it can be approved (and thus
 * included in the run) or left as draft (deferred) before creating a pay run.
 * These are exactly the logs the pay-run query skips (it requires status
 * 'approved'), which is why mileage silently dropped out.
 */
export async function previewUnapprovedMileage(input: { from: string; to: string }): Promise<{ entries: UnapprovedMileageEntry[]; error?: string }> {
  if (!input.from || !input.to) return { entries: [] }
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!isAdminUser(user)) return { entries: [], error: 'Admin only.' }

  const { data: emps } = await supabase
    .from('contractors').select('id, full_name, preferred_name').eq('status', 'active').neq('worker_type', 'contractor')
  const nameById = new Map((emps ?? []).map((e) => [e.id as string, ((e as { preferred_name?: string | null }).preferred_name || (e as { full_name?: string | null }).full_name || null)]))
  const ids = (emps ?? []).map((e) => e.id as string)
  if (ids.length === 0) return { entries: [] }

  const { data: logs, error } = await supabase
    .from('mileage_logs')
    .select('id, log_date, contractor_id, person_label, distance_km, reimbursement_amount')
    .in('contractor_id', ids)
    .eq('status', 'draft')
    .is('pay_run_id', null)
    .gte('log_date', input.from)
    .lte('log_date', input.to)
    .order('log_date')
  if (error) return { entries: [], error: error.message }

  const entries: UnapprovedMileageEntry[] = (logs ?? []).map((l) => ({
    id: l.id as string,
    logDate: l.log_date as string,
    personLabel: nameById.get(l.contractor_id as string) ?? (l.person_label as string | null),
    distanceKm: (l.distance_km as number | null) ?? null,
    amount: Number((l.reimbursement_amount as number | null) ?? 0),
  }))
  return { entries }
}

/**
 * Approve specific draft mileage logs (draft → approved) so they flow into the
 * pay run. Admin only. Deferring is simply NOT approving — a draft log is left
 * as-is and reappears in the next run's prompt.
 */
export async function bulkApproveMileage(input: { ids: string[] }): Promise<{ ok?: true; approved?: number; error?: string }> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!isAdminUser(user)) return { error: 'Admin only.' }
  if (!input.ids.length) return { ok: true, approved: 0 }

  const { data, error } = await supabase
    .from('mileage_logs')
    .update({ status: 'approved', approved_by: user!.id, approved_at: new Date().toISOString() })
    .in('id', input.ids)
    .eq('status', 'draft')
    .select('id')
  if (error) return { error: error.message }
  revalidatePath('/portal/payroll/new')
  revalidatePath('/portal/mileage')
  return { ok: true, approved: (data ?? []).length }
}

export async function previewPeriodMileage(input: { from: string; to: string }): Promise<{ total: number; count: number; error?: string }> {
  if (!input.from || !input.to) return { total: 0, count: 0 }
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!isAdminUser(user)) return { total: 0, count: 0, error: 'Admin only.' }

  const { data: emps } = await supabase
    .from('contractors').select('id').eq('status', 'active').neq('worker_type', 'contractor')
  const ids = (emps ?? []).map((e) => e.id as string)
  if (ids.length === 0) return { total: 0, count: 0 }

  const { data: logs } = await supabase
    .from('mileage_logs')
    .select('reimbursement_amount')
    .in('contractor_id', ids)
    .eq('status', 'approved')
    .is('pay_run_id', null)
    .gte('log_date', input.from)
    .lte('log_date', input.to)
  const total = Math.round((logs ?? []).reduce((s, l) => s + Number((l as { reimbursement_amount: number }).reimbursement_amount ?? 0), 0) * 100) / 100
  return { total, count: (logs ?? []).length }
}

/**
 * APPROVE a draft pay run (draft → approved). Freezes the calculation: the
 * figures + terms snapshot are now immutable (enforced by canModifyPayRun / the
 * delete guard). Finalises payslips. Does NOT pay the employee, settle mileage,
 * file, or remit. Mileage is handled in the separate monthly workflow — it is
 * deliberately NOT settled here.
 */
export async function approvePayRun(payRunId: string) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || !isAdminUser(user)) return { error: 'Admin only.' }

  const { data: run } = await supabase.from('pay_runs').select('status').eq('id', payRunId).single()
  if (!run) return { error: 'Pay run not found.' }
  const t = canTransitionPayment(run.status as string, 'approved')
  if (!t.ok) return { error: t.reason }

  const { error } = await supabase
    .from('pay_runs')
    .update({ status: 'approved', approved_at: new Date().toISOString(), approved_by: user.id })
    .eq('id', payRunId)
  if (error) return { error: error.message }

  // Approval freezes the figures + enables a live payslip PREVIEW. The OFFICIAL
  // retained payslip is generated only once the run is paid (it needs the payment
  // metadata), so nothing is created here.
  try {
    await supabase.from('audit_log').insert({ entity_table: 'pay_runs', entity_id: payRunId, action: 'pay_run_approved', detail: 'Pay run approved — figures frozen.', performed_by: user.id })
  } catch { /* audit shape varies */ }

  // Create the IRD liability line from the now-frozen figures (idempotent).
  // Best-effort: the ledger tables depend on the PR C migration; approval must
  // never fail because the ledger isn't applied yet.
  try { await ensureLiabilityLineForRun(supabase, payRunId) } catch (e) {
    console.error('[payroll] IRD liability not created (run migration?):', e instanceof Error ? e.message : e)
  }

  revalidatePath(`/portal/payroll/${payRunId}`)
  revalidatePath('/portal/payroll')
  return { success: true }
}

/**
 * Delete a DRAFT pay run. Only drafts can be deleted — an approved or paid run is
 * a financial record and must never be removed. Deleting a draft:
 *   1. un-stamps any mileage it consumed (pay_run_id → null) so it's re-usable,
 *   2. removes its pay_run_lines, then
 *   3. removes the run itself.
 * Admin only.
 */
export async function deleteDraftPayRun(payRunId: string): Promise<{ success?: true; error?: string }> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || !isAdminUser(user)) return { error: 'Admin only.' }

  const { data: run } = await supabase.from('pay_runs').select('status').eq('id', payRunId).single()
  if (!run) return { error: 'Pay run not found.' }
  if (run.status !== 'draft') return { error: `Only a draft pay run can be deleted (this one is ${run.status}). Approved/paid runs are financial records.` }

  // Release any mileage this draft had consumed so it flows into the next run.
  await supabase.from('mileage_logs').update({ pay_run_id: null }).eq('pay_run_id', payRunId)
  // Remove lines then the run.
  await supabase.from('pay_run_lines').delete().eq('pay_run_id', payRunId)
  const { error } = await supabase.from('pay_runs').delete().eq('id', payRunId)
  if (error) return { error: error.message }

  try { await supabase.from('audit_log').insert({ entity_table: 'pay_runs', entity_id: payRunId, action: 'pay_run_deleted', detail: 'Draft pay run deleted; mileage released.', performed_by: user.id }) } catch { /* audit shape varies */ }

  revalidatePath('/portal/payroll')
  return { success: true }
}

/**
 * Mark an approved run PAID (approved → paid) — RECORDS an existing bank
 * transfer; it never initiates a payment. Adds only employee-payment metadata.
 * Does NOT imply payday filing or IRD remittance is done (markPaidPatch carries
 * no filing/remittance fields), and never changes the frozen figures.
 */
export async function markPayRunPaid(input: { payRunId: string; paymentDate: string; paymentReference: string; paymentMethod: string }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || !isAdminUser(user)) return { error: 'Admin only.' }

  const details = { paymentDate: input.paymentDate, paymentReference: input.paymentReference, paymentMethod: input.paymentMethod }
  const v = validatePaymentDetails(details)
  if (!v.ok) return { error: v.reason }

  const { data: run } = await supabase.from('pay_runs').select('status').eq('id', input.payRunId).single()
  if (!run) return { error: 'Pay run not found.' }
  const t = canTransitionPayment(run.status as string, 'paid')
  if (!t.ok) return { error: t.reason }

  const { error } = await supabase
    .from('pay_runs')
    .update(markPaidPatch(details, new Date().toISOString(), user.id))
    .eq('id', input.payRunId)
  if (error) return { error: error.message }

  try {
    await supabase.from('audit_log').insert({ entity_table: 'pay_runs', entity_id: input.payRunId, action: 'pay_run_marked_paid', detail: `Recorded payment ${input.paymentReference} on ${input.paymentDate} (${input.paymentMethod}). Payday filing + IRD remittance remain separate.`, performed_by: user.id })
  } catch { /* audit shape varies */ }

  // Generate + retain the official payslip(s) now that payment metadata exists
  // (idempotent, best-effort). A render hiccup leaves the immutable record intact;
  // the explicit "Generate official payslip" action can retry the render/store.
  try {
    const { data: lines } = await supabase.from('pay_run_lines').select('id').eq('pay_run_id', input.payRunId)
    for (const l of (lines ?? []) as Array<{ id: string }>) await renderAndStoreOfficialPayslip(l.id)
  } catch (e) { console.error('[payroll] official payslip not generated (run migration?):', e instanceof Error ? e.message : e) }

  revalidatePath(`/portal/payroll/${input.payRunId}`)
  revalidatePath('/portal/payroll')
  return { success: true }
}

/**
 * Explicit admin action to generate the official payslip(s) for a PAID run — for
 * runs paid before payslips existed (e.g. Carol), or to retry a failed render.
 * Safe to retry: never creates a second version or new bytes once retained.
 */
export async function generateOfficialPayslips(payRunId: string): Promise<{ ok?: true; error?: string }> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || !isAdminUser(user)) return { error: 'Admin only.' }

  const { data: run } = await supabase.from('pay_runs').select('status').eq('id', payRunId).single()
  if (!run) return { error: 'Pay run not found.' }
  if (run.status !== 'paid') return { error: 'Official payslips can only be generated once the run is paid.' }

  const { data: lines } = await supabase.from('pay_run_lines').select('id').eq('pay_run_id', payRunId)
  let failed: string | null = null
  for (const l of (lines ?? []) as Array<{ id: string }>) {
    const res = await renderAndStoreOfficialPayslip(l.id)
    if (res.error) failed = res.error
  }
  if (failed) return { error: `Some payslips could not be generated: ${failed}` }

  try {
    await supabase.from('audit_log').insert({ entity_table: 'pay_runs', entity_id: payRunId, action: 'official_payslip_generated', detail: 'Official payslip(s) generated + retained.', performed_by: user.id })
  } catch { /* audit shape varies */ }
  revalidatePath(`/portal/payroll/${payRunId}`)
  return { ok: true }
}

function esc(s: string) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

function fmtNZD(d: number) {
  return new Intl.NumberFormat('en-NZ', { style: 'currency', currency: 'NZD' }).format(d)
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-NZ', { day: 'numeric', month: 'long', year: 'numeric' })
}

export async function sendPayslip(payslipId: string) {
  const supabase = createClient()

  const { data: payslip } = await supabase
    .from('payslips')
    .select('id, pay_run_line_id, contractor_id, pay_run_id')
    .eq('id', payslipId)
    .single()

  if (!payslip) return { error: 'Payslip not found.' }

  const [{ data: line }, { data: employee }, { data: run }] = await Promise.all([
    supabase.from('pay_run_lines').select('*').eq('id', payslip.pay_run_line_id).single(),
    supabase.from('contractors').select('full_name, email').eq('id', payslip.contractor_id).single(),
    supabase.from('pay_runs').select('pay_period_start, pay_period_end, pay_date').eq('id', payslip.pay_run_id).single(),
  ])

  if (!line || !employee || !run) return { error: 'Missing data.' }
  if (!employee.email) return { error: `${employee.full_name} has no email address.` }

  const firstName = employee.full_name.split(/\s+/)[0]
  const reimb = Number((line as { mileage_reimbursement?: number }).mileage_reimbursement ?? 0)

  const html = `
    <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:500px;margin:0 auto;color:#1a1a1a;">
      <h2 style="color:#076653;margin-bottom:4px;">Payslip</h2>
      <p style="color:#888;font-size:13px;margin-top:0;">Sano Property Services Limited</p>

      <p>Hi ${esc(firstName)},</p>
      <p>Here is your payslip for the period <strong>${fmtDate(run.pay_period_start)}</strong> to <strong>${fmtDate(run.pay_period_end)}</strong>.</p>

      <table style="width:100%;border-collapse:collapse;font-size:14px;margin:20px 0;">
        <tr style="border-bottom:1px solid #eee;"><td style="padding:8px 0;color:#888;">Pay date</td><td style="padding:8px 0;text-align:right;font-weight:600;">${fmtDate(run.pay_date)}</td></tr>
        <tr style="border-bottom:1px solid #eee;"><td style="padding:8px 0;color:#888;">Hours worked</td><td style="padding:8px 0;text-align:right;">${line.hours_worked}</td></tr>
        <tr style="border-bottom:1px solid #eee;"><td style="padding:8px 0;color:#888;">Hourly rate</td><td style="padding:8px 0;text-align:right;">${fmtNZD(line.hourly_rate)}</td></tr>
        <tr style="border-bottom:1px solid #eee;"><td style="padding:8px 0;color:#888;">Gross pay</td><td style="padding:8px 0;text-align:right;font-weight:600;">${fmtNZD(line.gross_pay)}</td></tr>
        ${line.holiday_pay > 0 ? `<tr style="border-bottom:1px solid #eee;"><td style="padding:8px 0;color:#888;">Holiday pay</td><td style="padding:8px 0;text-align:right;">${fmtNZD(line.holiday_pay)}</td></tr>` : ''}
        <tr style="border-bottom:1px solid #eee;"><td style="padding:8px 0;color:#888;">PAYE (${esc(line.tax_code || 'M')})</td><td style="padding:8px 0;text-align:right;color:#c53030;">-${fmtNZD(line.paye)}</td></tr>
        ${line.student_loan > 0 ? `<tr style="border-bottom:1px solid #eee;"><td style="padding:8px 0;color:#888;">Student loan</td><td style="padding:8px 0;text-align:right;color:#c53030;">-${fmtNZD(line.student_loan)}</td></tr>` : ''}
        ${line.kiwisaver_employee > 0 ? `<tr style="border-bottom:1px solid #eee;"><td style="padding:8px 0;color:#888;">KiwiSaver (employee)</td><td style="padding:8px 0;text-align:right;color:#c53030;">-${fmtNZD(line.kiwisaver_employee)}</td></tr>` : ''}
        ${reimb > 0 ? `
        <tr style="border-bottom:1px solid #eee;"><td style="padding:8px 0;font-weight:600;">Net pay</td><td style="padding:8px 0;text-align:right;font-weight:600;">${fmtNZD(line.net_pay)}</td></tr>
        <tr style="border-bottom:1px solid #eee;"><td style="padding:8px 0;color:#888;">Mileage reimbursement (non-taxable)</td><td style="padding:8px 0;text-align:right;color:#076653;">+${fmtNZD(reimb)}</td></tr>
        <tr style="background:#e8f5e9;"><td style="padding:12px 8px;font-weight:700;font-size:16px;">Total paid</td><td style="padding:12px 8px;text-align:right;font-weight:700;font-size:16px;color:#076653;">${fmtNZD(line.net_pay + reimb)}</td></tr>
        ` : `
        <tr style="background:#e8f5e9;"><td style="padding:12px 8px;font-weight:700;font-size:16px;">Net pay</td><td style="padding:12px 8px;text-align:right;font-weight:700;font-size:16px;color:#076653;">${fmtNZD(line.net_pay)}</td></tr>
        `}
      </table>

      ${reimb > 0 ? `<p style="font-size:12px;color:#888;">Mileage reimbursement is a non-taxable reimbursement — not part of gross pay or PAYE.</p>` : ''}
      ${line.kiwisaver_employer > 0 ? `<p style="font-size:12px;color:#888;">Employer KiwiSaver contribution: ${fmtNZD(line.kiwisaver_employer)}</p>` : ''}
      <p style="font-size:12px;color:#888;margin-top:24px;">Sano Property Services Limited</p>
    </div>
  `

  try {
    const resend = new Resend(process.env.RESEND_API_KEY)
    const { error: emailErr } = await resend.emails.send({
      from: 'Sano <noreply@sano.nz>',
      to: employee.email,
      subject: `Payslip — ${fmtDate(run.pay_period_start)} to ${fmtDate(run.pay_period_end)}`,
      html,
    })
    if (emailErr) return { error: `Email failed: ${emailErr.message}` }
  } catch (err) {
    return { error: `Email error: ${err}` }
  }

  await supabase.from('payslips').update({ sent_at: new Date().toISOString() }).eq('id', payslipId)
  revalidatePath(`/portal/payroll/${payslip.pay_run_id}`)
  return { success: true }
}

export async function sendAllPayslips(payRunId: string) {
  const supabase = createClient()

  const { data: payslips } = await supabase
    .from('payslips')
    .select('id')
    .eq('pay_run_id', payRunId)
    .is('sent_at', null)

  let sent = 0
  let failed = 0

  for (const ps of payslips ?? []) {
    const result = await sendPayslip(ps.id)
    if (result?.success) sent++
    else failed++
  }

  revalidatePath(`/portal/payroll/${payRunId}`)
  return { sent, failed }
}
