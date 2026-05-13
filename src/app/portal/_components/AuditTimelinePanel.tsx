// Phase 5B — shared read-only audit timeline.
//
// Reads from `audit_log` filtered by entity_table + entity_id, renders
// a compact list of recent activity. Used on client/quote/job detail
// pages. Server component — the supabase client comes from the calling
// page so we share the request-scoped session.

import type { SupabaseClient } from '@supabase/supabase-js'
import { Panel } from './Panel'

interface AuditEntry {
  id: string
  action: string
  created_at: string
  // `after` is a free-form jsonb column. We pluck two specific fields
  // (error message for invite_failed, attempt kind for invite_sent /
  // invite_failed) and ignore everything else. Keeping the rest of the
  // row's shape unknown is intentional — the timeline is a glance UI,
  // not a forensic dump.
  after?: { error?: unknown; attempt?: unknown } | null
}

// Combined action label map for every entity we mount this panel
// against. Keys must match the verbs used in `audit_log.action`.
const ACTION_LABELS: Record<string, string> = {
  // Clients
  'client.invite_sent':     'Invite sent',
  'client.access_disabled': 'Access disabled',
  'client.access_enabled':  'Access re-enabled',
  // Contractors
  'contractor.invite_sent':     'Invite sent',
  'contractor.invite_failed':   'Invite failed',
  'contractor.access_disabled': 'Access disabled',
  'contractor.access_enabled':  'Access re-enabled',
  // Quotes
  'quote.amended':                 'Quote amended',
  'quote.amended_after_invoice':   'Quote amended (after invoice)',
  // Jobs
  'job.amended':                   'Job amended',
  'job.amended_after_invoice':     'Job amended (after invoice)',
}

function fmtDateTime(iso: string) {
  return new Date(iso).toLocaleString('en-NZ', {
    day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

export async function AuditTimelinePanel({
  supabase,
  entityTable,
  entityId,
  title = 'Activity',
  className,
}: {
  supabase: SupabaseClient
  entityTable: 'clients' | 'contractors' | 'quotes' | 'jobs'
  entityId: string
  title?: string
  className?: string
}) {
  let entries: AuditEntry[] = []
  try {
    const { data } = await supabase
      .from('audit_log')
      .select('id, action, created_at, after')
      .eq('entity_table', entityTable)
      .eq('entity_id', entityId)
      .order('created_at', { ascending: false })
      .limit(50)
    entries = (data ?? []) as AuditEntry[]
  } catch (err) {
    // Mirror the clients/[id] pattern — never let an audit-log read
    // take the page down; log to the function logs and fall through
    // to an empty state.
    console.warn(`[AuditTimelinePanel] ${entityTable}:${entityId} failed:`, err)
    entries = []
  }

  return (
    <Panel title={title} padding="md" className={className}>
      {entries.length === 0 ? (
        <p className="text-sm text-sage-500">No history yet.</p>
      ) : (
        <ul className="divide-y divide-sage-50">
          {entries
            .filter((e) => e && typeof e.id === 'string')
            .map((e) => {
              const errText = typeof e.after?.error === 'string' ? e.after.error : null
              const attempt = typeof e.after?.attempt === 'string' ? e.after.attempt : null
              return (
                <li key={e.id} className="py-2.5">
                  <div className="flex items-start justify-between gap-3">
                    <p className="text-sm font-medium text-sage-800">
                      {(typeof e.action === 'string' && (ACTION_LABELS[e.action] ?? e.action)) || 'Activity'}
                      {attempt && (
                        <span className="ml-2 text-[11px] font-normal text-sage-500">
                          ({attempt === 'resend' ? 'resend' : 'first invite'})
                        </span>
                      )}
                    </p>
                    <p className="text-[11px] text-sage-500 whitespace-nowrap">
                      {typeof e.created_at === 'string' ? fmtDateTime(e.created_at) : '—'}
                    </p>
                  </div>
                  {errText && (
                    <p className="text-xs text-red-600 mt-1">{errText}</p>
                  )}
                </li>
              )
            })}
        </ul>
      )}
    </Panel>
  )
}
