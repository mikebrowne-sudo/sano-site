'use server'

// Admin-only, guarded deletion of a DRAFT pay run. Approved/paid/completed runs,
// and anything with a payslip, payday-filing progress or an IRD liability line,
// are permanent. Records who/when in the audit log. Releases any linked mileage
// back to approved-unreimbursed so trips aren't lost.

import { createClient } from '@/lib/supabase-server'
import { getServiceSupabase } from '@/lib/supabase-service'
import { isAdminUser } from '@/lib/is-admin'
import { redirect } from 'next/navigation'
import { canDeletePayRunDraft } from '@/lib/payroll/delete-draft-guard'

export async function deletePayRunDraft(input: { runId: string }): Promise<{ error?: string }> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated.' }
  if (!isAdminUser(user)) return { error: 'Admin only.' }

  const svc = getServiceSupabase()
  const { data: run } = await svc
    .from('pay_runs')
    .select('id, status, paid_at, payday_filing_status, pay_period_start, pay_period_end, pay_date')
    .eq('id', input.runId)
    .maybeSingle()
  if (!run) return { error: 'Pay run not found.' }

  const [{ count: payslips }, liabilityLines] = await Promise.all([
    svc.from('payslips').select('*', { count: 'exact', head: true }).eq('pay_run_id', input.runId),
    // ird_liability_lines arrives with PR C; treat as 0 until then.
    (async () => {
      try {
        const { count } = await svc.from('ird_liability_lines').select('*', { count: 'exact', head: true }).eq('pay_run_id', input.runId)
        return count ?? 0
      } catch { return 0 }
    })(),
  ])

  const r = run as { status: string; paid_at: string | null; payday_filing_status: string | null }
  const guard = canDeletePayRunDraft({
    status: r.status,
    paidAt: r.paid_at,
    filingStatus: r.payday_filing_status,
    payslips: payslips ?? 0,
    liabilityLines,
  })
  if (!guard.ok) return { error: guard.reason }

  // Release any linked mileage, then delete the lines and the run.
  try { await svc.from('mileage_logs').update({ pay_run_id: null }).eq('pay_run_id', input.runId) } catch { /* column may not exist */ }
  await svc.from('pay_run_lines').delete().eq('pay_run_id', input.runId)
  const { error: delErr } = await svc.from('pay_runs').delete().eq('id', input.runId)
  if (delErr) return { error: `Couldn’t delete: ${delErr.message}` }

  try {
    await svc.from('audit_log').insert({
      entity_table: 'pay_runs', entity_id: input.runId, action: 'draft_pay_run_deleted',
      detail: `Deleted draft pay run (period ${(run as { pay_period_start: string }).pay_period_start} – ${(run as { pay_period_end: string }).pay_period_end}).`,
      performed_by: user.id,
    })
  } catch { /* audit shape varies; never block */ }

  redirect('/portal/payroll?deleted=1')
}
