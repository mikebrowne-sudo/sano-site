'use server'

import { createClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { notifyContractorAssigned } from '@/lib/notify-contractor'

interface JobInput {
  client_id: string
  quote_id?: string
  invoice_id?: string
  title?: string
  description?: string
  address?: string
  scheduled_date?: string
  scheduled_time?: string
  duration_estimate?: string
  assigned_to?: string
  contractor_id?: string
  contractor_price?: number
  job_price?: number
  internal_notes?: string
}

export async function createJob(input: JobInput) {
  const supabase = createClient()

  if (!input.client_id) {
    return { error: 'Client is required.' }
  }

  const { data, error } = await supabase
    .from('jobs')
    .insert({
      client_id: input.client_id,
      quote_id: input.quote_id || null,
      invoice_id: input.invoice_id || null,
      title: input.title || null,
      description: input.description || null,
      address: input.address || null,
      scheduled_date: input.scheduled_date || null,
      scheduled_time: input.scheduled_time || null,
      duration_estimate: input.duration_estimate || null,
      assigned_to: input.assigned_to || null,
      contractor_id: input.contractor_id || null,
      contractor_price: input.contractor_price ?? null,
      job_price: input.job_price ?? null,
      internal_notes: input.internal_notes || null,
    })
    .select('id, job_number')
    .single()

  if (error || !data) {
    return { error: `Failed to create job: ${error?.message}` }
  }

  // Notify contractor if assigned on creation
  if (input.contractor_id) {
    const { data: contractor } = await supabase
      .from('contractors')
      .select('full_name, email')
      .eq('id', input.contractor_id)
      .single()

    if (contractor) {
      await notifyContractorAssigned(contractor, {
        id: data.id,
        job_number: data.job_number,
        title: input.title || null,
        address: input.address || null,
        scheduled_date: input.scheduled_date || null,
        scheduled_time: input.scheduled_time || null,
        duration_estimate: input.duration_estimate || null,
      })
    }
  }

  redirect(`/portal/jobs/${data.id}`)
}

interface UpdateJobInput extends JobInput {
  id: string
  status?: string
  contractor_notes?: string
}

export async function updateJob(input: UpdateJobInput) {
  const supabase = createClient()

  // Load current contractor_id to detect changes
  const { data: current } = await supabase
    .from('jobs')
    .select('contractor_id')
    .eq('id', input.id)
    .single()

  const contractorChanged = !!input.contractor_id
    && input.contractor_id !== (current?.contractor_id ?? '')

  const { error } = await supabase
    .from('jobs')
    .update({
      client_id: input.client_id,
      quote_id: input.quote_id || null,
      invoice_id: input.invoice_id || null,
      status: input.status || 'draft',
      title: input.title || null,
      description: input.description || null,
      address: input.address || null,
      scheduled_date: input.scheduled_date || null,
      scheduled_time: input.scheduled_time || null,
      duration_estimate: input.duration_estimate || null,
      assigned_to: input.assigned_to || null,
      contractor_id: input.contractor_id || null,
      contractor_price: input.contractor_price ?? null,
      job_price: input.job_price ?? null,
      internal_notes: input.internal_notes || null,
      contractor_notes: input.contractor_notes || null,
    })
    .eq('id', input.id)

  if (error) {
    return { error: `Failed to update job: ${error.message}` }
  }

  // Notify new contractor if assignment changed
  if (contractorChanged) {
    const [{ data: contractor }, { data: job }] = await Promise.all([
      supabase.from('contractors').select('full_name, email').eq('id', input.contractor_id!).single(),
      supabase.from('jobs').select('id, job_number').eq('id', input.id).single(),
    ])

    if (contractor && job) {
      await notifyContractorAssigned(contractor, {
        id: job.id,
        job_number: job.job_number,
        title: input.title || null,
        address: input.address || null,
        scheduled_date: input.scheduled_date || null,
        scheduled_time: input.scheduled_time || null,
        duration_estimate: input.duration_estimate || null,
      })
    }
  }

  revalidatePath(`/portal/jobs/${input.id}`)
  revalidatePath('/portal/jobs')
  redirect(`/portal/jobs/${input.id}`)
}

export async function duplicateJob(jobId: string) {
  const supabase = createClient()

  const { data: source, error: loadErr } = await supabase
    .from('jobs')
    .select('client_id, title, description, address, scheduled_time, duration_estimate, contractor_id, assigned_to, contractor_price')
    .eq('id', jobId)
    .single()

  if (loadErr || !source) {
    return { error: `Job not found: ${loadErr?.message}` }
  }

  const { data: newJob, error: createErr } = await supabase
    .from('jobs')
    .insert({
      client_id: source.client_id,
      title: source.title,
      description: source.description,
      address: source.address,
      scheduled_time: source.scheduled_time,
      duration_estimate: source.duration_estimate,
      contractor_id: source.contractor_id,
      assigned_to: source.assigned_to,
      contractor_price: source.contractor_price,
      status: 'draft',
    })
    .select('id')
    .single()

  if (createErr || !newJob) {
    return { error: `Failed to duplicate job: ${createErr?.message}` }
  }

  revalidatePath('/portal/jobs')
  redirect(`/portal/jobs/${newJob.id}/edit`)
}
