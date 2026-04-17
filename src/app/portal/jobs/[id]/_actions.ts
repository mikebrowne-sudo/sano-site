'use server'

import { createClient } from '@/lib/supabase-server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { notifyContractorAssigned } from '@/lib/notify-contractor'

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

export async function assignJob(jobId: string, contractorId: string) {
  const supabase = createClient()

  if (!contractorId) {
    return { error: 'Please select a contractor.' }
  }

  // Look up contractor details
  const { data: contractor } = await supabase
    .from('contractors')
    .select('full_name, email')
    .eq('id', contractorId)
    .single()

  if (!contractor) {
    return { error: 'Contractor not found.' }
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
