'use server'

import { createClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { notifyContractorAssigned } from '@/lib/notify-contractor'
import { computeNextInvoiceDate } from '@/lib/recurring-invoice'
import { resolveAllowedHours } from '@/lib/allowed-hours'
import { buildRecurringWorkerRow, type RecurringPayType } from '@/lib/recurring-worker'
import { rollbackOrphanOccurrence } from '@/lib/recurring-rollback'

interface RecurringJobInput {
  client_id: string
  title?: string
  description?: string
  address?: string
  scheduled_time?: string
  duration_estimate?: string
  contractor_id?: string
  contractor_pay_type?: string
  assigned_to?: string
  contractor_price?: number
  frequency: string
  start_date: string
  end_date?: string
  status?: string
  monthly_value?: number
  invoice_auto_send?: boolean
  invoice_send_day?: number
  contractor_monthly_pay?: number
  billing_mode?: string
  per_visit_rate?: number
  service_days_of_week?: number[]
  contractor_rate_override?: number
  contractor_pay_mode?: string
  contractor_per_visit_rate?: number
}

function calcNextDueDate(startDate: string, frequency: string, after?: string | null): string | null {
  const start = new Date(startDate)
  const cursor = new Date(start)
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
      contractor_pay_type: input.contractor_pay_type === 'fixed' ? 'fixed' : 'hourly',
      assigned_to: input.assigned_to || null,
      contractor_price: input.contractor_price ?? null,
      frequency: input.frequency,
      start_date: input.start_date,
      end_date: input.end_date || null,
      status: input.status || 'active',
      next_due_date: nextDue,
      monthly_value: input.monthly_value ?? null,
      contractor_monthly_pay: input.contractor_monthly_pay ?? null,
      invoice_auto_send: input.invoice_auto_send ?? false,
      invoice_send_day: input.invoice_send_day ?? null,
      billing_mode: input.billing_mode ?? 'fixed',
      per_visit_rate: input.per_visit_rate ?? null,
      service_days_of_week: input.service_days_of_week ?? null,
      contractor_rate_override: input.contractor_rate_override ?? null,
      contractor_pay_mode: input.contractor_pay_mode ?? 'fixed',
      contractor_per_visit_rate: input.contractor_per_visit_rate ?? null,
      next_invoice_date: input.invoice_send_day
        ? computeNextInvoiceDate(input.start_date, input.invoice_send_day)
        : null,
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
    .select('last_generated_date, next_due_date, next_invoice_date')
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
      contractor_pay_type: input.contractor_pay_type === 'fixed' ? 'fixed' : 'hourly',
      assigned_to: input.assigned_to || null,
      contractor_price: input.contractor_price ?? null,
      frequency: input.frequency,
      start_date: input.start_date,
      end_date: input.end_date || null,
      status: input.status || 'active',
      next_due_date: nextDue,
      monthly_value: input.monthly_value ?? null,
      contractor_monthly_pay: input.contractor_monthly_pay ?? null,
      invoice_auto_send: input.invoice_auto_send ?? false,
      invoice_send_day: input.invoice_send_day ?? null,
      billing_mode: input.billing_mode ?? 'fixed',
      per_visit_rate: input.per_visit_rate ?? null,
      service_days_of_week: input.service_days_of_week ?? null,
      contractor_rate_override: input.contractor_rate_override ?? null,
      contractor_pay_mode: input.contractor_pay_mode ?? 'fixed',
      contractor_per_visit_rate: input.contractor_per_visit_rate ?? null,
      // Keep an existing schedule; only (re)seed when a day is set and none exists.
      next_invoice_date: input.invoice_send_day
        ? (current?.next_invoice_date ?? computeNextInvoiceDate(new Date().toISOString().slice(0, 10), input.invoice_send_day))
        : (current?.next_invoice_date ?? null),
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
  const { data: { user } } = await supabase.auth.getUser()

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

  // PR C — seed the contractor's job_workers row (snapshotted rate + basis). If
  // it fails, roll the occurrence back so we never leave a payable job with
  // contractor_id but no authoritative job_workers row.
  if (rec.contractor_id) {
    const { data: c } = await supabase
      .from('contractors')
      .select('hourly_rate')
      .eq('id', rec.contractor_id)
      .single()
    // Per-job override wins over the contractor's profile rate when set.
    const overrideRate = (rec as { contractor_rate_override?: number | null }).contractor_rate_override
    const workerRow = buildRecurringWorkerRow({
      jobId: newJob.id as string,
      contractorId: rec.contractor_id as string,
      contractorRate: (overrideRate != null ? Number(overrideRate) : (c?.hourly_rate as number | null)) ?? null,
      allowedHours: resolveAllowedHours(null, rec.duration_estimate as string | null),
      payType: (rec.contractor_pay_type as RecurringPayType) === 'fixed' ? 'fixed' : 'hourly',
    })
    const { error: wErr } = await supabase.from('job_workers').insert(workerRow)
    if (wErr) {
      const rb = await rollbackOrphanOccurrence(supabase, {
        jobId: newJob.id as string,
        contractorId: rec.contractor_id as string,
        seedError: wErr.message,
        actorId: user?.id ?? null,
        recurringJobId: recurringId,
        date: rec.next_due_date as string,
      })
      if (rb.rolledBack) {
        return { error: `Could not seed the contractor's pay record, so the job was not generated: ${wErr.message}` }
      }
      if (rb.neutralized) {
        return { error: `The contractor pay record failed and the job couldn't be deleted — it was neutralised to an unassigned draft (job ${newJob.id}). It is not payable. Original error: ${wErr.message}` }
      }
      return { error: `CRITICAL: the contractor pay record failed and the job could not be cleaned up (job ${newJob.id}, contractor ${rec.contractor_id}). It has been flagged in the audit log — do not pay it. Original error: ${wErr.message}` }
    }
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
