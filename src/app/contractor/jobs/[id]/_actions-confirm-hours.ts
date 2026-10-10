'use server'

// Contractor confirms a completed job went to plan.
//
// One question, two answers — deliberately NOT a timesheet. Under the
// allowed-hours model the pay basis is hours_allocated × rate, agreed when the
// job was created, so there is nothing for the contractor to compute. The only
// thing that matters is whether it ran over.
//
//   "Yes, as planned" → hours_confirmed_status = 'as_planned'.
//                       Carol can bulk-approve these.
//   "Took longer"     → hours_confirmed_status = 'took_longer', plus the extra
//                       hours recorded through the EXISTING extra-hours flow
//                       (job_workers.extra_hours*), which still requires admin
//                       sign-off before it touches pay.
//
// A contractor can never move money here. The confirmation is descriptive; the
// pay basis only changes when an admin approves the extra hours.

import { createClient } from '@/lib/supabase-server'
import { getServiceSupabase } from '@/lib/supabase-service'
import { revalidatePath } from 'next/cache'
import { isConfirmable } from '@/lib/hours-confirmation'

/** Resolve the signed-in contractor. */
async function getContractorId(): Promise<string | null> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data } = await supabase
    .from('contractors')
    .select('id')
    .eq('auth_user_id', user.id)
    .maybeSingle()
  return data?.id ?? null
}

export type ConfirmHoursAnswer = 'as_planned' | 'took_longer'

export interface ConfirmHoursInput {
  jobId: string
  answer: ConfirmHoursAnswer
  /** Positive hours the job ran over by. Required for 'took_longer'. */
  extraHours?: number
  /** Why it ran over. Required for 'took_longer' — Carol needs the reason. */
  note?: string
}

export async function confirmJobHours(
  input: ConfirmHoursInput,
): Promise<{ ok: true } | { error: string }> {
  const contractorId = await getContractorId()
  if (!contractorId) return { error: 'Not authenticated.' }

  const supabase = createClient()

  // Assignment lives in job_workers — a non-primary worker on a two-cleaner job
  // confirms their OWN row, so ownership is checked there, not on
  // jobs.contractor_id.
  const { data: row } = await supabase
    .from('job_workers')
    .select('id, hours_confirmed_status, jobs ( id, status, scheduled_date, completed_at )')
    .eq('job_id', input.jobId)
    .eq('contractor_id', contractorId)
    .maybeSingle()
  if (!row) return { error: 'You are not assigned to this job.' }

  const jobRow = row.jobs as unknown as { status: string | null } | null
  if (!jobRow || !isConfirmable({
    id: input.jobId,
    status: jobRow.status ?? '',
    scheduledDate: null,
    completedAt: null,
  })) {
    return { error: 'This job isn’t finished yet, so there’s nothing to confirm.' }
  }

  const now = new Date().toISOString()
  // job_workers RLS gives contractors no UPDATE (deliberately), so the
  // contractor's own client silently saved nothing. Write with the service
  // client — scoped to the one roster row verified above — and treat 0 rows
  // as a failure rather than reporting success.
  const svc = getServiceSupabase()

  if (input.answer === 'as_planned') {
    const { data: saved, error } = await svc
      .from('job_workers')
      .update({
        hours_confirmed_status: 'as_planned',
        hours_confirmed_at: now,
        hours_confirmed_note: input.note?.trim() || null,
      })
      .eq('id', row.id)
      .select('id')
    if (error) return { error: `Could not save: ${error.message}` }
    if (!saved?.length) return { error: 'Could not save your confirmation. Please try again.' }
  } else {
    const hours = Number(input.extraHours)
    if (!Number.isFinite(hours) || hours <= 0) {
      return { error: 'Enter how many extra hours the job took.' }
    }
    if (!input.note?.trim()) {
      return { error: 'Please say briefly why it took longer.' }
    }

    // Record the overrun through the existing extra-hours state machine, which
    // lands it as `pending` for admin sign-off. The contractor's own figure
    // NEVER counts toward pay until an admin approves it.
    const { data: saved, error } = await svc
      .from('job_workers')
      .update({
        hours_confirmed_status: 'took_longer',
        hours_confirmed_at: now,
        hours_confirmed_note: input.note.trim(),
        extra_hours: hours,
        extra_hours_reason: `Contractor: ${input.note.trim()}`,
        extra_hours_status: 'pending',
        extra_hours_approved_at: null,
        extra_hours_approved_by: null,
      })
      .eq('id', row.id)
      .select('id')
    if (error) return { error: `Could not save: ${error.message}` }
    if (!saved?.length) return { error: 'Could not save your confirmation. Please try again.' }
  }

  await svc.from('audit_log').insert({
    actor_role: 'contractor',
    action: 'job_worker.hours_confirmed',
    entity_table: 'job_workers',
    entity_id: `${input.jobId}:${contractorId}`,
    before: { hours_confirmed_status: row.hours_confirmed_status ?? 'unconfirmed' },
    after: {
      hours_confirmed_status: input.answer,
      extra_hours: input.answer === 'took_longer' ? Number(input.extraHours) : null,
      note: input.note?.trim() || null,
    },
  })

  revalidatePath(`/contractor/jobs/${input.jobId}`)
  revalidatePath('/contractor/jobs')
  revalidatePath(`/portal/jobs/${input.jobId}`)
  revalidatePath('/portal/contractor-invoices/pending-approvals')
  return { ok: true }
}
