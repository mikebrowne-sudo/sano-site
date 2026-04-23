'use server'

// Phase 6 — quote and invoice hard-delete have been retired in favour of
// soft-delete (archive) via src/app/portal/_actions/archive.ts.
// This file now only handles clients / jobs / contractors, where
// archive semantics are out of scope for this phase.

import { createClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'

const ADMIN_EMAIL = 'michael@sano.nz'

export async function deleteClient(clientId: string) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user || user.email !== ADMIN_EMAIL) {
    return { error: 'You do not have permission to delete clients.' }
  }

  const { error } = await supabase.from('clients').delete().eq('id', clientId)

  if (error) {
    return { error: `Failed to delete client: ${error.message}. The client may have linked quotes, invoices, or jobs.` }
  }

  redirect('/portal/clients')
}

// Jobs: hard-delete is gated server-side. Only draft/assigned jobs can be deleted,
// and only when not linked to a sent or paid invoice. In-progress / completed / invoiced
// jobs have actual-hours and payroll history (CASCADE on job_workers would wipe it).
export async function deleteJob(jobId: string) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user || user.email !== ADMIN_EMAIL) {
    return { error: 'You do not have permission to delete jobs.' }
  }

  const { data: job, error: loadErr } = await supabase
    .from('jobs')
    .select('status, invoice_id')
    .eq('id', jobId)
    .single()

  if (loadErr || !job) {
    return { error: `Job not found: ${loadErr?.message ?? 'unknown'}` }
  }

  if (!['draft', 'assigned'].includes(job.status)) {
    return { error: `Cannot delete — job status is "${job.status}". Only draft or assigned jobs can be deleted.` }
  }

  if (job.invoice_id) {
    const { data: inv, error: invErr } = await supabase
      .from('invoices')
      .select('status')
      .eq('id', job.invoice_id)
      .single()
    if (invErr) {
      return { error: `Cannot verify linked invoice: ${invErr.message}` }
    }
    if (inv && ['sent', 'paid'].includes(inv.status)) {
      return { error: `Cannot delete — this job is linked to a ${inv.status} invoice.` }
    }
  }

  const { error } = await supabase.from('jobs').delete().eq('id', jobId)

  if (error) {
    return { error: `Failed to delete job: ${error.message}` }
  }

  redirect('/portal/jobs')
}

// Contractors: hard-delete relies on Postgres RESTRICT on contractor_invoices /
// pay_run_lines / payslips. Any contractor with financial history is blocked at the DB.
// We surface that as an actionable message pointing to the existing deactivate flow.
export async function deleteContractor(contractorId: string) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user || user.email !== ADMIN_EMAIL) {
    return { error: 'You do not have permission to delete contractors.' }
  }

  const { error } = await supabase.from('contractors').delete().eq('id', contractorId)

  if (error) {
    if (/foreign key|violates|restrict|contractor_invoices|pay_run_lines|payslips/i.test(error.message)) {
      return { error: 'Cannot delete — this contractor has payroll or invoice history. Set their status to Inactive instead.' }
    }
    return { error: `Failed to delete contractor: ${error.message}` }
  }

  redirect('/portal/contractors')
}
