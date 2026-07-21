// Compensating rollback for a recurring occurrence whose job_workers seed
// failed (Stage 0 PR C). The invariant: a payable-looking job (jobs.contractor_id
// set) must NEVER be left without an authoritative job_workers row.
//
// Escalation:
//   1. Delete the just-created job. If that succeeds, the occurrence is gone.
//   2. If the delete ALSO fails, NEUTRALISE the job so it can't look payable or
//      contractor-ready — clear contractor_id/assigned_to and drop it to 'draft'
//      (no contractor pointer + no job_workers row = not payable, invisible to
//      any contractor portal).
//   3. Always write a high-visibility audit row carrying the job id + contractor
//      id + every error, so a double failure is loud, never silent.
//
// The caller must treat rolledBack=false as a failure (never a success result).

import type { createClient } from './supabase-server'

type Supabase = ReturnType<typeof createClient>

export interface RollbackParams {
  jobId: string
  contractorId: string
  seedError: string
  actorId: string | null
  recurringJobId?: string | null
  date?: string | null
}

export interface RollbackResult {
  /** Job deleted cleanly — no orphan. */
  rolledBack: boolean
  /** Delete failed but the job was neutralised (unassigned draft, not payable). */
  neutralized: boolean
  /** Delete AND neutralise failed — a loud audit was written; needs manual repair. */
  orphaned: boolean
}

export async function rollbackOrphanOccurrence(supabase: Supabase, p: RollbackParams): Promise<RollbackResult> {
  const { error: delErr } = await supabase.from('jobs').delete().eq('id', p.jobId)

  if (!delErr) {
    await supabase.from('audit_log').insert({
      actor_id: p.actorId,
      actor_role: 'staff',
      action: 'recurring_job.occurrence_rolled_back',
      entity_table: 'jobs',
      entity_id: p.jobId,
      before: null,
      after: { recurring_job_id: p.recurringJobId ?? null, contractor_id: p.contractorId, date: p.date ?? null, seed_error: p.seedError },
    })
    return { rolledBack: true, neutralized: false, orphaned: false }
  }

  // Delete failed — neutralise so the incomplete job can't appear payable /
  // contractor-ready (best-effort; failure is captured in the loud audit).
  const { error: neuErr } = await supabase
    .from('jobs')
    .update({ contractor_id: null, assigned_to: null, status: 'draft' })
    .eq('id', p.jobId)

  await supabase.from('audit_log').insert({
    actor_id: p.actorId,
    actor_role: 'staff',
    action: 'recurring_job.orphan_alert', // high-visibility: needs manual attention
    entity_table: 'jobs',
    entity_id: p.jobId,
    before: null,
    after: {
      severity: 'high',
      job_id: p.jobId,
      contractor_id: p.contractorId,
      recurring_job_id: p.recurringJobId ?? null,
      date: p.date ?? null,
      seed_error: p.seedError,
      delete_error: delErr.message,
      neutralize_error: neuErr?.message ?? null,
      neutralized: !neuErr,
    },
  })

  return { rolledBack: false, neutralized: !neuErr, orphaned: !!neuErr }
}
