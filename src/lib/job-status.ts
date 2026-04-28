// Phase 5.5.16 — derived job status.
//
// The `jobs.status` column persists the operator's last action
// ('draft' / 'assigned' / 'in_progress' / 'completed' / 'invoiced')
// but it can drift from operational reality:
//   - a job marked 'assigned' that loses its contractor → no longer assigned
//   - a job marked 'completed' that still has no completed_at → unclear
//
// `getJobStatus` returns the *operationally honest* status from the
// fields that actually drive the workflow. Use this for filtering,
// list tabs, and display. The stored `status` is still the audit
// trail of explicit operator transitions — keep it for history, but
// do not branch UI on it.

export type DerivedJobStatus =
  | 'needs_scheduling'
  | 'scheduled'
  | 'in_progress'
  | 'completed'
  | 'invoiced'

export interface JobStatusInput {
  scheduled_date: string | null | undefined
  contractor_id: string | null | undefined
  assigned_to?: string | null | undefined
  started_at?: string | null | undefined
  completed_at?: string | null | undefined
  invoice_id?: string | null | undefined
}

export function getJobStatus(j: JobStatusInput): DerivedJobStatus {
  // Order matters — later states win. A job that's been invoiced
  // doesn't go "back" to in_progress because completed_at exists.
  if (j.invoice_id) return 'invoiced'
  if (j.completed_at) return 'completed'
  if (j.started_at) return 'in_progress'

  const hasContractor = !!j.contractor_id || !!(j.assigned_to && j.assigned_to.trim())
  if (j.scheduled_date && hasContractor) return 'scheduled'

  return 'needs_scheduling'
}

export const JOB_STATUS_LABEL: Record<DerivedJobStatus, string> = {
  needs_scheduling: 'Needs scheduling',
  scheduled:        'Scheduled',
  in_progress:      'In progress',
  completed:        'Completed',
  invoiced:         'Invoiced',
}
