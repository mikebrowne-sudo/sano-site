// MODULE-LOAD TRACE — fires once when the bundle for this route is
// evaluated on the server. If you don't see this in Netlify Function
// logs after a request, the module never loaded (build / route /
// runtime issue, not a render bug).
console.error('[clients-debug] MODULE_LOADED clients/[id]/page')

import { createClient } from '@/lib/supabase-server'
import { notFound } from 'next/navigation'
import { ClientForm } from '../_components/ClientForm'
import Link from 'next/link'
import { ArrowLeft, Archive } from 'lucide-react'
import { ClientAccessPanel } from './_components/ClientAccessPanel'
import { ClientCleanupActions } from './_components/ClientCleanupActions'
import { loadWorkforceSettings } from '@/lib/workforce-settings'
import { findPossibleDuplicates, getClientLinkCounts } from '../_lib-cleanup'

console.error('[clients-debug] MODULE_LOADED clients/[id]/page — imports resolved')

// Phase 5.5.7 — read-only audit timeline mirroring the staff pattern.
const ACTION_LABELS: Record<string, string> = {
  'client.invite_sent':     'Invite sent',
  'client.access_disabled': 'Access disabled',
  'client.access_enabled':  'Access re-enabled',
}

function fmtDateTime(iso: string) {
  return new Date(iso).toLocaleString('en-NZ', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

type AuditEntry = {
  id: string
  action: string
  created_at: string
}

// ────────────────────────────────────────────────────────────────────
// TEMPORARY DIAGNOSTICS — debug/clients-detail-diagnostics
//
// Wraps each section of the client detail render in a labelled
// try/catch so the next crash leaves a clear breadcrumb in Netlify
// logs. On error: logs the section label + clientId + error message
// + stack, then rethrows so Next still shows the standard error page.
//
// Search Netlify logs for [clients-debug] to find the breadcrumb
// trail. The last [clients-debug] start: <label> line before the
// FAIL is the section that crashed. Remove this scaffolding once we
// know the cause.
// ────────────────────────────────────────────────────────────────────
const DEBUG_TAG = '[clients-debug]'

async function trace<T>(label: string, clientId: string | null, fn: () => Promise<T> | PromiseLike<T>): Promise<T> {
  console.error(`${DEBUG_TAG} start: ${label} cid=${clientId ?? '—'}`)
  try {
    const out = await fn()
    console.error(`${DEBUG_TAG} ok:    ${label} cid=${clientId ?? '—'}`)
    return out
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    const stack = err instanceof Error && err.stack ? err.stack.split('\n').slice(0, 6).join('\n') : '(no stack)'
    console.error(`${DEBUG_TAG} FAIL:  ${label} cid=${clientId ?? '—'} :: ${msg}\n${stack}`)
    throw err
  }
}

function syncTrace<T>(label: string, clientId: string | null, fn: () => T): T {
  console.error(`${DEBUG_TAG} start: ${label} cid=${clientId ?? '—'}`)
  try {
    const out = fn()
    console.error(`${DEBUG_TAG} ok:    ${label} cid=${clientId ?? '—'}`)
    return out
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    const stack = err instanceof Error && err.stack ? err.stack.split('\n').slice(0, 6).join('\n') : '(no stack)'
    console.error(`${DEBUG_TAG} FAIL:  ${label} cid=${clientId ?? '—'} :: ${msg}\n${stack}`)
    throw err
  }
}

export default async function ClientDetailPage({ params }: { params: { id: string } }) {
  // PAGE_ENTRY — first line of the page function. If MODULE_LOADED
  // appears but PAGE_ENTRY does NOT for a given request, the module
  // is loaded but Next is not invoking the page (wrong route hit,
  // middleware redirect, error boundary above this). If PAGE_ENTRY
  // appears, the section traces below pinpoint the failure.
  console.error('[clients-debug] PAGE_ENTRY clients/[id]/page params=', JSON.stringify(params ?? {}))
  const cid = params?.id ?? null
  console.error(`${DEBUG_TAG} ENTER ClientDetailPage cid=${cid ?? '—'}`)

  const supabase = syncTrace('supabase_client_create', cid, () => createClient())

  const clientResult = await trace('client_fetch', cid, () => supabase
    .from('clients')
    .select('id, name, company_name, email, phone, service_address, billing_address, billing_same_as_service, notes, auth_user_id, invite_sent_at, invite_accepted_at, access_disabled_at, access_disabled_reason, is_archived, archived_at')
    .eq('id', params.id)
    .single())
  const { data: client, error } = clientResult

  if (error || !client) {
    console.error(`${DEBUG_TAG} client_fetch returned no row for cid=${cid ?? '—'} (error=${error?.message ?? 'none'}) → notFound()`)
    notFound()
  }

  const { data: { user } } = await trace('auth_get_user', cid, () => supabase.auth.getUser())
  const isAdmin = user?.email === 'michael@sano.nz'

  // Phase 5.5.10 fix — every parallel branch is wrapped so a single
  // failure (RLS edge case, slow network, missing column) never takes
  // the whole page down. Each fallback is a safe empty value and the
  // raw error goes to the server log via console.warn.
  // Each section gets its own labelled trace. They still run in
  // parallel via Promise.all below — the trace just emits start/ok or
  // FAIL log lines so Netlify shows exactly which one breaks.
  const settledSettings = trace('settings_load', cid, () => loadWorkforceSettings(supabase)).catch((err) => {
    // Already logged inside trace (via FAIL); this catch keeps the
    // page resilient and converts to safe default.
    console.warn(`${DEBUG_TAG} settings_load fallback to null:`, err instanceof Error ? err.message : err)
    return null
  })
  const settledAudit: Promise<AuditEntry[]> = trace('audit_log_fetch', cid, async () => {
    const { data } = await supabase
      .from('audit_log')
      .select('id, action, created_at')
      .eq('entity_table', 'clients')
      .eq('entity_id', params.id)
      .order('created_at', { ascending: false })
      .limit(50)
    return (data ?? []) as AuditEntry[]
  }).catch((err) => {
    console.warn(`${DEBUG_TAG} audit_log_fetch fallback to []:`, err instanceof Error ? err.message : err)
    return [] as AuditEntry[]
  })
  const settledLinks = trace('link_counts', cid, () => getClientLinkCounts(params.id)).catch((err) => {
    console.warn(`${DEBUG_TAG} link_counts fallback:`, err instanceof Error ? err.message : err)
    return { error: 'failed' } as { error: string }
  })
  const settledDupes = trace('duplicate_checks', cid, () => findPossibleDuplicates(params.id)).catch((err) => {
    console.warn(`${DEBUG_TAG} duplicate_checks fallback to []:`, err instanceof Error ? err.message : err)
    return [] as never
  })
  const settledCandidates: Promise<{ id: string; name: string; company_name: string | null }[]> = trace('merge_candidates_fetch', cid, async () => {
    const { data } = await supabase
      .from('clients')
      .select('id, name, company_name')
      .eq('is_archived', false)
      .neq('id', params.id)
      .order('name')
    return (data ?? []) as { id: string; name: string; company_name: string | null }[]
  }).catch((err) => {
    console.warn(`${DEBUG_TAG} merge_candidates_fetch fallback to []:`, err instanceof Error ? err.message : err)
    return [] as { id: string; name: string; company_name: string | null }[]
  })

  const [settings, auditRowsRaw, linkCountsRes, dupesRes, mergeCandidatesRaw] = await trace('parallel_resolve', cid, () => Promise.all([
    settledSettings, settledAudit, settledLinks, settledDupes, settledCandidates,
  ]))

  const audit: AuditEntry[] = syncTrace('reduce_audit', cid, () => (auditRowsRaw ?? []) as AuditEntry[])
  const linkCounts = syncTrace('reduce_link_counts', cid, () =>
    (linkCountsRes && typeof linkCountsRes === 'object' && 'error' in linkCountsRes)
      ? { quotes: 0, jobs: 0, invoices: 0, contacts: 0, sites: 0 }
      : (linkCountsRes ?? { quotes: 0, jobs: 0, invoices: 0, contacts: 0, sites: 0 })
  )
  const duplicates = syncTrace('reduce_duplicates', cid, () => Array.isArray(dupesRes) ? dupesRes : [])
  const mergeCandidates = syncTrace('reduce_merge_candidates', cid, () => (mergeCandidatesRaw ?? []) as { id: string; name: string; company_name: string | null }[])
  const isArchived = syncTrace('reduce_is_archived', cid, () => !!(client as { is_archived?: boolean }).is_archived)
  const customerPortalEnabled = syncTrace('reduce_feature_flag', cid, () => !!settings?.enable_customer_portal)

  // Safe view-model. Every field used by the JSX below is computed
  // once here with an explicit fallback. Any cast/null pitfall is
  // contained to this single function.
  const vm = syncTrace('build_view_model', cid, () => {
    const c = (client ?? {}) as Record<string, unknown>
    const asStr = (v: unknown, fb = ''): string => typeof v === 'string' ? v : fb
    const asStrOrNull = (v: unknown): string | null =>
      typeof v === 'string' && v.length > 0 ? v : null
    const asBool = (v: unknown, fb = false): boolean => typeof v === 'boolean' ? v : fb
    return {
      id:                      asStr(c.id),
      name:                    asStr(c.name) || 'Unnamed client',
      company_name:            asStrOrNull(c.company_name),
      email:                   asStrOrNull(c.email),
      phone:                   asStrOrNull(c.phone),
      service_address:         asStrOrNull(c.service_address),
      billing_address:         asStrOrNull(c.billing_address),
      billing_same_as_service: asBool(c.billing_same_as_service, true),
      notes:                   asStrOrNull(c.notes),
      auth_user_id:            asStrOrNull(c.auth_user_id),
      invite_sent_at:          asStrOrNull(c.invite_sent_at),
      invite_accepted_at:      asStrOrNull(c.invite_accepted_at),
      access_disabled_at:      asStrOrNull(c.access_disabled_at),
      access_disabled_reason:  asStrOrNull(c.access_disabled_reason),
    }
  })

  console.error(`${DEBUG_TAG} render_start cid=${cid ?? '—'} archived=${isArchived} dupes=${duplicates.length} mergeCandidates=${mergeCandidates.length} audit=${audit.length} name_len=${vm.name.length}`)

  // safeRender wraps each section in a try/catch so a synchronous
  // throw during JSX evaluation is caught and replaced with an
  // amber placeholder. Async server-component children still rely on
  // the route-segment error boundary if THEY throw.
  function safeRender(label: string, fn: () => React.ReactNode): React.ReactNode {
    try {
      return fn()
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      console.error(`${DEBUG_TAG} RENDER_FAIL section=${label} cid=${cid ?? '—'} :: ${msg}`)
      return (
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 mb-4 text-sm text-amber-800">
          <strong>{label}</strong> couldn’t render. {msg}
        </div>
      )
    }
  }

  return (
    <div>
      <Link
        href="/portal/clients"
        className="inline-flex items-center gap-1.5 text-sm text-sage-600 hover:text-sage-800 transition-colors mb-4"
      >
        <ArrowLeft size={14} />
        Back to clients
      </Link>

      {safeRender('header', () => (
        <div className="flex items-center justify-between mb-8 gap-3 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold text-sage-800">{vm.name}</h1>
            {isArchived && (
              <span className="inline-flex items-center gap-1.5 mt-1 text-xs font-medium text-sage-600 bg-sage-100 rounded-full px-2.5 py-0.5">
                <Archive size={11} />
                Archived
              </span>
            )}
          </div>
        </div>
      ))}

      {isAdmin && safeRender('cleanup_actions', () => (
        <ClientCleanupActions
          clientId={vm.id}
          clientName={vm.name}
          isArchived={isArchived}
          links={linkCounts}
          mergeCandidates={mergeCandidates}
        />
      ))}

      {Array.isArray(duplicates) && duplicates.length > 0 && isAdmin && safeRender('duplicates_panel', () => (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 mb-6">
          <h2 className="text-base font-semibold text-amber-900 mb-2">Possible duplicates</h2>
          <p className="text-xs text-amber-800 mb-3">
            These active clients share an email, phone number, or name with this one. Use Merge above to combine them.
          </p>
          <ul className="divide-y divide-amber-100">
            {duplicates
              .filter((d) => d && typeof d.id === 'string')
              .map((d) => (
                <li key={d.id} className="py-2.5 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <Link href={`/portal/clients/${d.id}`} className="text-sage-800 font-medium hover:underline">
                      {(typeof d.name === 'string' && d.name) || 'Unnamed client'}
                    </Link>
                    <p className="text-xs text-sage-500 mt-0.5">
                      {d.company_name ? <>{d.company_name} · </> : null}
                      {d.email ? <>{d.email} · </> : null}
                      {d.phone ? <>{d.phone}</> : null}
                    </p>
                  </div>
                  <span className="shrink-0 text-[10px] uppercase tracking-wide font-semibold text-amber-700 bg-amber-100 rounded-full px-2 py-0.5">
                    Same {d.matched_on ?? '—'}
                  </span>
                </li>
              ))}
          </ul>
        </div>
      ))}

      {/* Phase 5.5.6 — Client portal access (mirror of contractor 5.5.3). */}
      {safeRender('access_panel', () => (
        <ClientAccessPanel
          clientId={vm.id}
          email={vm.email}
          authUserId={vm.auth_user_id}
          inviteSentAt={vm.invite_sent_at}
          inviteAcceptedAt={vm.invite_accepted_at}
          accessDisabledAt={vm.access_disabled_at}
          accessDisabledReason={vm.access_disabled_reason}
          featureEnabled={customerPortalEnabled}
        />
      ))}

      {safeRender('client_form', () => (
        <ClientForm
          client={{
            id: vm.id,
            name: vm.name === 'Unnamed client' ? '' : vm.name,
            company_name: vm.company_name,
            email: vm.email,
            phone: vm.phone,
            service_address: vm.service_address,
            billing_address: vm.billing_address,
            billing_same_as_service: vm.billing_same_as_service,
            notes: vm.notes,
          }}
        />
      ))}

      {/* Phase 5.5.7 — Activity timeline (audit_log; read-only). */}
      {safeRender('activity_timeline', () => (
        <div className="bg-white rounded-2xl border border-sage-100 shadow-sm p-6 mt-6">
          <h2 className="text-base font-semibold text-sage-800 mb-3">Activity</h2>
          {!Array.isArray(audit) || audit.length === 0 ? (
            <p className="text-sm text-sage-500">No history yet.</p>
          ) : (
            <ul className="divide-y divide-sage-50">
              {audit
                .filter((e) => e && typeof e.id === 'string')
                .map((e) => (
                  <li key={e.id} className="py-2.5">
                    <div className="flex items-start justify-between gap-3">
                      <p className="text-sm font-medium text-sage-800">
                        {(typeof e.action === 'string' && (ACTION_LABELS[e.action] ?? e.action)) || 'Activity'}
                      </p>
                      <p className="text-[11px] text-sage-500 whitespace-nowrap">
                        {typeof e.created_at === 'string' ? fmtDateTime(e.created_at) : '—'}
                      </p>
                    </div>
                  </li>
                ))}
            </ul>
          )}
        </div>
      ))}
    </div>
  )
}
