// Job amendment versioning — shared helpers.
//
// A "version" is a point-in-time snapshot of the whole job row taken just
// BEFORE an edit is applied, so any amendment can be reversed. Snapshotting
// is best-effort history, not part of the edit transaction: a failure is
// logged but never blocks the underlying save.
//
// See the `job_versions` table (docs/db/2026-07-09-job-versions.sql).

import type { SupabaseClient } from '@supabase/supabase-js'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SB = SupabaseClient<any, 'public'>

/**
 * Operator-editable fields tracked for change-detection, history display,
 * and restore. Deliberately excludes workflow/linkage columns
 * (status, client_id, quote_id, invoice_id) so a restore never silently
 * unlinks an invoice or rewinds the job's workflow state.
 */
export const JOB_TRACKED_FIELDS = [
  'title',
  'description',
  'address',
  'scheduled_date',
  'scheduled_time',
  'duration_estimate',
  'assigned_to',
  'contractor_id',
  'contractor_price',
  'job_price',
  'allowed_hours',
  'internal_notes',
  'contractor_notes',
] as const

export type JobTrackedField = (typeof JOB_TRACKED_FIELDS)[number]

/** Human-friendly labels for the tracked fields (used in the history UI). */
export const JOB_FIELD_LABELS: Record<JobTrackedField, string> = {
  title: 'Title',
  description: 'Description',
  address: 'Address',
  scheduled_date: 'Scheduled date',
  scheduled_time: 'Scheduled time',
  duration_estimate: 'Duration estimate',
  assigned_to: 'Assigned to',
  contractor_id: 'Contractor',
  contractor_price: 'Contractor price',
  job_price: 'Client price',
  allowed_hours: 'Contractor hours',
  internal_notes: 'Internal notes',
  contractor_notes: 'Contractor notes',
}

/** Return the tracked fields whose value differs between two job states. */
export function computeChangedJobFields(
  before: Record<string, unknown> | null | undefined,
  after: Record<string, unknown>,
): string[] {
  const out: string[] = []
  for (const f of JOB_TRACKED_FIELDS) {
    if ((before?.[f] ?? null) !== (after[f] ?? null)) out.push(f)
  }
  return out
}

export interface SnapshotJobVersionInput {
  jobId: string
  /** Full job row as it was BEFORE the edit being recorded. */
  snapshot: Record<string, unknown>
  changedFields: string[]
  reason?: string | null
  isRestore?: boolean
  actorId?: string | null
  actorEmail?: string | null
}

/**
 * Insert a pre-edit snapshot as the next version for a job. Best-effort:
 * versioning is history, not part of the edit transaction, so any failure
 * (including the table not existing before the migration is run) is logged
 * and swallowed rather than surfaced to the operator.
 */
export async function snapshotJobVersion(
  supabase: SB,
  input: SnapshotJobVersionInput,
): Promise<void> {
  try {
    const { data: last } = await supabase
      .from('job_versions')
      .select('version_no')
      .eq('job_id', input.jobId)
      .order('version_no', { ascending: false })
      .limit(1)
      .maybeSingle()

    const nextNo = ((last?.version_no as number | null) ?? 0) + 1

    const { error } = await supabase.from('job_versions').insert({
      job_id: input.jobId,
      version_no: nextNo,
      snapshot: input.snapshot,
      reason: input.reason ?? null,
      changed_fields: input.changedFields,
      is_restore: input.isRestore ?? false,
      actor_id: input.actorId ?? null,
      actor_email: input.actorEmail ?? null,
    })
    if (error) console.warn('[job-versions] snapshot insert failed:', error.message)
  } catch (err) {
    console.warn('[job-versions] snapshot failed:', err)
  }
}
