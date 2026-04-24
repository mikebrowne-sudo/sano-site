'use server'

import { createClient } from '@/lib/supabase-server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { notifyContractorAssigned } from '@/lib/notify-contractor'

// Phase D — mark a completed job as reviewed. Captures reviewed_at
// + reviewed_by (FK to auth.users) and audit-logs the transition.
// The workflow bar reads reviewed_at to advance to the Reviewed
// stage. Does not change jobs.status itself — review is a layer on
// top of the existing status enum, not a replacement.
export async function markJobReviewed(jobId: string) {
  const supabase = createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: 'Not authenticated.' }
  }

  const { data: priorJob, error: readErr } = await supabase
    .from('jobs')
    .select('status, reviewed_at')
    .eq('id', jobId)
    .single()

  if (readErr || !priorJob) {
    return { error: `Job not found: ${readErr?.message ?? 'missing row'}` }
  }
  if (priorJob.status !== 'completed' && priorJob.status !== 'invoiced') {
    return { error: 'Only completed jobs can be marked as reviewed.' }
  }
  if (priorJob.reviewed_at) {
    return { error: 'This job has already been reviewed.' }
  }

  const now = new Date().toISOString()

  const { error: updErr } = await supabase
    .from('jobs')
    .update({ reviewed_at: now, reviewed_by: user.id })
    .eq('id', jobId)

  if (updErr) {
    return { error: `Failed to mark reviewed: ${updErr.message}` }
  }

  await supabase.from('audit_log').insert({
    actor_id: user.id,
    actor_role: 'staff',
    action: 'job.reviewed',
    entity_table: 'jobs',
    entity_id: jobId,
    before: { reviewed_at: null },
    after: { reviewed_at: now, reviewed_by: user.id },
  })

  revalidatePath(`/portal/jobs/${jobId}`)
  return { ok: true }
}

export async function createInvoiceFromJob(jobId: string) {
  const supabase = createClient()

  // 1. Load job
  const { data: job, error: jErr } = await supabase
    .from('jobs')
    .select('client_id, quote_id, invoice_id, title, description, address, scheduled_date, job_price')
    .eq('id', jobId)
    .single()

  if (jErr || !job) {
    return { error: `Job not found: ${jErr?.message}` }
  }

  if (job.invoice_id) {
    return { error: 'This job already has an invoice.' }
  }

  if (job.job_price == null) {
    return { error: 'Job price must be set before creating an invoice.' }
  }

  // 2. Create invoice
  const { data: invoice, error: iErr } = await supabase
    .from('invoices')
    .insert({
      client_id: job.client_id,
      quote_id: job.quote_id || null,
      service_address: job.address || null,
      scheduled_clean_date: job.scheduled_date || null,
      base_price: job.job_price,
      notes: job.description || null,
    })
    .select('id')
    .single()

  if (iErr || !invoice) {
    return { error: `Failed to create invoice: ${iErr?.message}` }
  }

  // 3. Create invoice item
  const label = job.title || 'Cleaning service'

  await supabase
    .from('invoice_items')
    .insert({
      invoice_id: invoice.id,
      label,
      price: job.job_price,
      sort_order: 0,
    })

  // 4. Link invoice to job and set status to invoiced
  await supabase
    .from('jobs')
    .update({ invoice_id: invoice.id, status: 'invoiced' })
    .eq('id', jobId)

  revalidatePath(`/portal/jobs/${jobId}`)
  revalidatePath('/portal/jobs')
  revalidatePath('/portal/invoices')

  redirect(`/portal/invoices/${invoice.id}`)
}

export async function startJob(jobId: string) {
  const supabase = createClient()

  const { error } = await supabase
    .from('jobs')
    .update({ status: 'in_progress', started_at: new Date().toISOString() })
    .eq('id', jobId)

  if (error) {
    return { error: `Failed to start job: ${error.message}` }
  }

  revalidatePath(`/portal/jobs/${jobId}`)
  revalidatePath('/portal/jobs')
  return { success: true }
}

export async function completeJob(jobId: string) {
  const supabase = createClient()

  const { error } = await supabase
    .from('jobs')
    .update({ status: 'completed', completed_at: new Date().toISOString() })
    .eq('id', jobId)

  if (error) {
    return { error: `Failed to complete job: ${error.message}` }
  }

  revalidatePath(`/portal/jobs/${jobId}`)
  revalidatePath('/portal/jobs')
  return { success: true }
}

export async function updateWorkerActualHours(jobId: string, contractorId: string, actualHours: number) {
  const supabase = createClient()

  const { error } = await supabase
    .from('job_workers')
    .update({ actual_hours: actualHours })
    .eq('job_id', jobId)
    .eq('contractor_id', contractorId)

  if (error) return { error: error.message }

  revalidatePath(`/portal/jobs/${jobId}`)
  return { success: true }
}

export async function assignJob(jobId: string, contractorId: string) {
  const supabase = createClient()

  if (!contractorId) {
    return { error: 'Please select a contractor.' }
  }

  // Look up contractor details
  const { data: contractor } = await supabase
    .from('contractors')
    .select('full_name, email, insurance_expiry')
    .eq('id', contractorId)
    .single()

  if (!contractor) {
    return { error: 'Contractor not found.' }
  }

  // Block assignment if insurance is missing or expired
  const today = new Date().toISOString().slice(0, 10)
  if (!contractor.insurance_expiry) {
    return { error: `Cannot assign — ${contractor.full_name} has no insurance expiry on file. Update the contractor's insurance details first.` }
  }
  if (contractor.insurance_expiry < today) {
    return { error: `Cannot assign — ${contractor.full_name}'s insurance expired on ${contractor.insurance_expiry}. Update the contractor's insurance details first.` }
  }

  // Load current job to detect contractor change and get job details
  const { data: job } = await supabase
    .from('jobs')
    .select('status, contractor_id, job_number, title, address, scheduled_date, scheduled_time, duration_estimate')
    .eq('id', jobId)
    .single()

  if (!job) {
    return { error: 'Job not found.' }
  }

  const contractorChanged = contractorId !== (job.contractor_id ?? '')
  const newStatus = job.status === 'draft' ? 'assigned' : job.status

  const { error } = await supabase
    .from('jobs')
    .update({
      contractor_id: contractorId,
      assigned_to: contractor.full_name,
      status: newStatus,
    })
    .eq('id', jobId)

  if (error) {
    return { error: `Failed to assign job: ${error.message}` }
  }

  // Notify contractor if assignment is new or changed
  if (contractorChanged) {
    await notifyContractorAssigned(contractor, {
      id: jobId,
      job_number: job.job_number,
      title: job.title,
      address: job.address,
      scheduled_date: job.scheduled_date,
      scheduled_time: job.scheduled_time,
      duration_estimate: job.duration_estimate,
    })
  }

  revalidatePath(`/portal/jobs/${jobId}`)
  revalidatePath('/portal/jobs')
  return { success: true }
}
