'use server'

import { createClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { notifyContractorAssigned } from '@/lib/notify-contractor'

interface RecurringJobInput {
  client_id: string
  title?: string
  description?: string
  address?: string
  scheduled_time?: string
  duration_estimate?: string
  contractor_id?: string
  assigned_to?: string
  contractor_price?: number
  frequency: string
  start_date: string
  end_date?: string
  status?: string
}

function calcNextDueDate(startDate: string, frequency: string, after?: string | null): string | null {
  const start = new Date(startDate)
  let cursor = new Date(start)
  const afterDate = after ? new Date(after) : new Date(startDate)
  afterDate.setDate(afterDate.getDate() - 1) // include the after date itself

  // Advance cursor until it's past afterDate
  while (cursor <= afterDate) {
    if (frequency === 'weekly') cursor.setDate(cursor.getDate() + 7)
    else if (frequency === 'fortnightly') cursor.setDate(cursor.getDate() + 14)
    else if (frequency === 'monthly') cursor.setMonth(cursor.getMonth() + 1)
    else break
  }

  return cursor.toISOString().slice(0, 10)
}

export async function createRecurringJob(input: RecurringJobInput) {
  const supabase = createClient()

  if (!input.client_id) return { error: 'Client is required.' }
  if (!input.frequency) return { error: 'Frequency is required.' }
  if (!input.start_date) return { error: 'Start date is required.' }

  const nextDue = calcNextDueDate(input.start_date, input.frequency)

  const { data, error } = await supabase
    .from('recurring_jobs')
    .insert({
      client_id: input.client_id,
      title: input.title || null,
      description: input.description || null,
      address: input.address || null,
      scheduled_time: input.scheduled_time || null,
      duration_estimate: input.duration_estimate || null,
      contractor_id: input.contractor_id || null,
      assigned_to: input.assigned_to || null,
      contractor_price: input.contractor_price ?? null,
      frequency: input.frequency,
      start_date: input.start_date,
      end_date: input.end_date || null,
      status: input.status || 'active',
      next_due_date: nextDue,
    })
    .select('id')
    .single()

  if (error || !data) {
    return { error: `Failed to create recurring job: ${error?.message}` }
  }

  redirect(`/portal/recurring-jobs/${data.id}`)
}

export async function updateRecurringJob(id: string, input: RecurringJobInput) {
  const supabase = createClient()

  if (!input.client_id) return { error: 'Client is required.' }

  // Recalculate next_due_date if frequency or start changed
  const { data: current } = await supabase
    .from('recurring_jobs')
    .select('last_generated_date, next_due_date')
    .eq('id', id)
    .single()

  const nextDue = calcNextDueDate(
    input.start_date,
    input.frequency,
    current?.last_generated_date,
  )

  const { error } = await supabase
    .from('recurring_jobs')
    .update({
      client_id: input.client_id,
      title: input.title || null,
      description: input.description || null,
      address: input.address || null,
      scheduled_time: input.scheduled_time || null,
      duration_estimate: input.duration_estimate || null,
      contractor_id: input.contractor_id || null,
      assigned_to: input.assigned_to || null,
      contractor_price: input.contractor_price ?? null,
      frequency: input.frequency,
      start_date: input.start_date,
      end_date: input.end_date || null,
      status: input.status || 'active',
      next_due_date: nextDue,
    })
    .eq('id', id)

  if (error) {
    return { error: `Failed to update: ${error.message}` }
  }

  revalidatePath(`/portal/recurring-jobs/${id}`)
  revalidatePath('/portal/recurring-jobs')
  redirect(`/portal/recurring-jobs/${id}`)
}

export async function generateNextJob(recurringId: string) {
  const supabase = createClient()

  const { data: rec, error: loadErr } = await supabase
    .from('recurring_jobs')
    .select('*')
    .eq('id', recurringId)
    .single()

  if (loadErr || !rec) {
    return { error: 'Recurring job not found.' }
  }

  if (rec.status !== 'active') {
    return { error: 'This recurring job is paused.' }
  }

  if (!rec.next_due_date) {
    return { error: 'No next due date calculated.' }
  }

  // Check end date
  if (rec.end_date && rec.next_due_date > rec.end_date) {
    return { error: 'Next due date is past the end date.' }
  }

  // Prevent duplicate: check if a job already exists for this date
  const { data: existing } = await supabase
    .from('jobs')
    .select('id')
    .eq('recurring_job_id', recurringId)
    .eq('scheduled_date', rec.next_due_date)
    .maybeSingle()

  if (existing) {
    return { error: `A job already exists for ${rec.next_due_date}.` }
  }

  // Create the job
  const jobStatus = rec.contractor_id ? 'assigned' : 'draft'

  const { data: newJob, error: createErr } = await supabase
    .from('jobs')
    .insert({
      client_id: rec.client_id,
      recurring_job_id: recurringId,
      title: rec.title,
      description: rec.description,
      address: rec.address,
      scheduled_date: rec.next_due_date,
      scheduled_time: rec.scheduled_time,
      duration_estimate: rec.duration_estimate,
      contractor_id: rec.contractor_id,
      assigned_to: rec.assigned_to,
      contractor_price: rec.contractor_price,
      status: jobStatus,
    })
    .select('id, job_number')
    .single()

  if (createErr || !newJob) {
    return { error: `Failed to generate job: ${createErr?.message}` }
  }

  // Advance the recurring schedule
  const newNextDue = calcNextDueDate(rec.start_date, rec.frequency, rec.next_due_date)

  await supabase
    .from('recurring_jobs')
    .update({
      last_generated_date: rec.next_due_date,
      next_due_date: newNextDue,
    })
    .eq('id', recurringId)

  // Notify contractor if assigned
  if (rec.contractor_id) {
    const { data: contractor } = await supabase
      .from('contractors')
      .select('full_name, email')
      .eq('id', rec.contractor_id)
      .single()

    if (contractor) {
      await notifyContractorAssigned(contractor, {
        id: newJob.id,
        job_number: newJob.job_number,
        title: rec.title,
        address: rec.address,
        scheduled_date: rec.next_due_date,
        scheduled_time: rec.scheduled_time,
        duration_estimate: rec.duration_estimate,
      })
    }
  }

  revalidatePath(`/portal/recurring-jobs/${recurringId}`)
  revalidatePath('/portal/recurring-jobs')
  revalidatePath('/portal/jobs')

  return { success: true, jobId: newJob.id, jobNumber: newJob.job_number }
}

export async function createRecurringFromJob(jobId: string) {
  const supabase = createClient()

  const { data: job, error } = await supabase
    .from('jobs')
    .select('client_id, title, description, address, scheduled_time, duration_estimate, contractor_id, assigned_to, contractor_price, scheduled_date')
    .eq('id', jobId)
    .single()

  if (error || !job) {
    return { error: 'Job not found.' }
  }

  const startDate = job.scheduled_date || new Date().toISOString().slice(0, 10)

  const { data, error: createErr } = await supabase
    .from('recurring_jobs')
    .insert({
      client_id: job.client_id,
      title: job.title,
      description: job.description,
      address: job.address,
      scheduled_time: job.scheduled_time,
      duration_estimate: job.duration_estimate,
      contractor_id: job.contractor_id,
      assigned_to: job.assigned_to,
      contractor_price: job.contractor_price,
      frequency: 'weekly',
      start_date: startDate,
      next_due_date: startDate,
      status: 'active',
    })
    .select('id')
    .single()

  if (createErr || !data) {
    return { error: `Failed to create recurring job: ${createErr?.message}` }
  }

  redirect(`/portal/recurring-jobs/${data.id}/edit`)
}
