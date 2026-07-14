'use server'

// Restore a job to a previous version. Admin-only. Deliberately bypasses the
// invoice-sent lock — restore is a recovery action that must work even on a
// locked job. The pre-restore state is snapshotted as a new version first, so
// a restore is itself reversible, and the action is audit-logged.

import { createClient } from '@/lib/supabase-server'
import { revalidatePath } from 'next/cache'
import { isAdminUser } from '@/lib/is-admin'
import { snapshotJobVersion, computeChangedJobFields, JOB_TRACKED_FIELDS } from '@/lib/job-versions'

export async function restoreJobVersion(input: {
  jobId: string
  versionId: string
}): Promise<{ ok: true } | { error: string }> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!isAdminUser(user)) {
    return { error: 'Only an admin can restore a previous version.' }
  }

  const [{ data: version }, { data: current }] = await Promise.all([
    supabase
      .from('job_versions')
      .select('id, version_no, snapshot')
      .eq('id', input.versionId)
      .eq('job_id', input.jobId)
      .maybeSingle(),
    supabase.from('jobs').select('*').eq('id', input.jobId).maybeSingle(),
  ])
  if (!version) return { error: 'That version could not be found.' }
  if (!current) return { error: 'Job not found.' }

  const snap = (version.snapshot ?? {}) as Record<string, unknown>
  const patch: Record<string, unknown> = {}
  for (const f of JOB_TRACKED_FIELDS) patch[f] = snap[f] ?? null

  const changedFields = computeChangedJobFields(current, patch)
  if (changedFields.length === 0) {
    return { error: 'This version matches the job as it is now — nothing to restore.' }
  }

  const { error } = await supabase.from('jobs').update(patch).eq('id', input.jobId)
  if (error) return { error: `Restore failed: ${error.message}` }

  // Snapshot the pre-restore state so the restore can itself be undone.
  await snapshotJobVersion(supabase, {
    jobId: input.jobId,
    snapshot: current,
    changedFields,
    reason: `Restored to v${version.version_no}`,
    isRestore: true,
    actorId: user?.id ?? null,
    actorEmail: user?.email ?? null,
  })

  try {
    await supabase.from('audit_log').insert({
      actor_id: user?.id ?? null,
      actor_role: 'admin',
      action: 'job.version_restored',
      entity_table: 'jobs',
      entity_id: input.jobId,
      before: null,
      after: { restored_to_version: version.version_no },
    })
  } catch {
    // Audit is append-only history, not part of the restore transaction.
  }

  revalidatePath(`/portal/jobs/${input.jobId}`)
  return { ok: true }
}
