import { createClient } from '@/lib/supabase-server'
import { notFound } from 'next/navigation'
import { ClientForm } from '../_components/ClientForm'
import Link from 'next/link'
import { Archive } from 'lucide-react'
import { ClientAccessPanel } from './_components/ClientAccessPanel'
import { ClientCleanupActions } from './_components/ClientCleanupActions'
import { ApplyProposedNameButton } from '../_components/ApplyProposedNameButton'
import { PortalPageHeader } from '../../_components/PortalPageHeader'
import { Panel } from '../../_components/Panel'
import { loadWorkforceSettings } from '@/lib/workforce-settings'
import { findPossibleDuplicates, getClientLinkCounts } from '../_lib-cleanup'
import { proposedAccountName } from '@/lib/account-cleanup'
import { isAdminUser } from '@/lib/is-admin'

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

export default async function ClientDetailPage({ params }: { params: { id: string } }) {
  const supabase = createClient()

  // Perf — auth is independent of the client record, so fetch both
  // concurrently instead of sequentially (saves a round-trip).
  const [{ data: client, error }, { data: { user } }] = await Promise.all([
    supabase
      .from('clients')
      .select('id, name, company_name, branch_name, email, phone, service_address, billing_address, billing_same_as_service, notes, auth_user_id, invite_sent_at, invite_accepted_at, access_disabled_at, access_disabled_reason, is_archived, archived_at')
      .eq('id', params.id)
      .single(),
    supabase.auth.getUser(),
  ])

  if (error || !client) notFound()

  const isAdmin = isAdminUser(user)

  // Each parallel branch is wrapped so a single failure (RLS edge,
  // transient network, missing column) never takes the page down.
  // Failures fall back to a safe empty value and the raw error goes
  // to console.warn for the function logs.
  const settledSettings = loadWorkforceSettings(supabase).catch((err) => {
    console.warn('[clients/[id]] loadWorkforceSettings failed:', err)
    return null
  })
  const settledAudit: Promise<AuditEntry[]> = (async () => {
    try {
      const { data } = await supabase
        .from('audit_log')
        .select('id, action, created_at')
        .eq('entity_table', 'clients')
        .eq('entity_id', params.id)
        .order('created_at', { ascending: false })
        .limit(50)
      return (data ?? []) as AuditEntry[]
    } catch (err) {
      console.warn('[clients/[id]] audit_log failed:', err)
      return [] as AuditEntry[]
    }
  })()
  const settledLinks = getClientLinkCounts(params.id).catch((err) => {
    console.warn('[clients/[id]] getClientLinkCounts threw:', err)
    return { error: 'failed' } as { error: string }
  })
  // Phase 3 perf — both findPossibleDuplicates and the merge-candidate
  // roster only feed admin-only UI (the duplicates banner and the
  // ClientCleanupActions panel). For non-admins these queries returned
  // data that was immediately discarded. Skip them entirely off the
  // admin path; the page renders strictly faster for staff users.
  const settledDupes = isAdmin
    ? findPossibleDuplicates(params.id).catch((err) => {
        console.warn('[clients/[id]] findPossibleDuplicates threw:', err)
        return [] as never
      })
    : Promise.resolve([] as never)
  const settledCandidates: Promise<{ id: string; name: string; company_name: string | null }[]> = isAdmin
    ? (async () => {
        try {
          const { data } = await supabase
            .from('clients')
            .select('id, name, company_name')
            .eq('is_archived', false)
            .neq('id', params.id)
            .order('name')
          return (data ?? []) as { id: string; name: string; company_name: string | null }[]
        } catch (err) {
          console.warn('[clients/[id]] mergeCandidates failed:', err)
          return [] as { id: string; name: string; company_name: string | null }[]
        }
      })()
    : Promise.resolve([] as { id: string; name: string; company_name: string | null }[])

  const [settings, auditRowsRaw, linkCountsRes, dupesRes, mergeCandidatesRaw] = await Promise.all([
    settledSettings, settledAudit, settledLinks, settledDupes, settledCandidates,
  ])

  const audit: AuditEntry[] = (auditRowsRaw ?? []) as AuditEntry[]
  const linkCounts = (linkCountsRes && typeof linkCountsRes === 'object' && 'error' in linkCountsRes)
    ? { quotes: 0, jobs: 0, invoices: 0, contacts: 0, sites: 0 }
    : (linkCountsRes ?? { quotes: 0, jobs: 0, invoices: 0, contacts: 0, sites: 0 })
  const allMatches = Array.isArray(dupesRes) ? dupesRes : []
  // Branch-style matches (same parent brand, different branch) are NOT
  // merge candidates — show them separately so Carol isn't nudged to
  // merge e.g. Barfoot & Thompson / Ellerslie into / Ponsonby.
  const duplicates = allMatches.filter((d) => (d as { kind?: string }).kind !== 'branch')
  const branchAccounts = allMatches.filter((d) => (d as { kind?: string }).kind === 'branch')
  const mergeCandidates = (mergeCandidatesRaw ?? []) as { id: string; name: string; company_name: string | null }[]
  const isArchived = !!(client as { is_archived?: boolean }).is_archived
  const customerPortalEnabled = !!settings?.enable_customer_portal

  // Safe view-model: every JSX-bound field is materialised once with
  // an explicit fallback. Casts off the raw DB row stay in this helper.
  const c = (client ?? {}) as Record<string, unknown>
  const asStr = (v: unknown, fb = ''): string => typeof v === 'string' ? v : fb
  const asStrOrNull = (v: unknown): string | null => typeof v === 'string' && v.length > 0 ? v : null
  const asBool = (v: unknown, fb = false): boolean => typeof v === 'boolean' ? v : fb
  const vm = {
    id:                      asStr(c.id),
    name:                    asStr(c.name) || 'Unnamed client',
    company_name:            asStrOrNull(c.company_name),
    branch_name:             asStrOrNull(c.branch_name),
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

  const proposedName = proposedAccountName(
    vm.name === 'Unnamed client' ? null : vm.name,
    vm.company_name,
  )

  return (
    <div>
      <PortalPageHeader
        backHref="/portal/clients"
        backLabel="Back to clients"
        title={vm.name}
        titleAdornment={isArchived && (
          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-sage-600 bg-sage-100 rounded-full px-2.5 py-0.5">
            <Archive size={11} />
            Archived
          </span>
        )}
      />

      {isAdmin && (
        <ClientCleanupActions
          clientId={vm.id}
          clientName={vm.name}
          isArchived={isArchived}
          links={linkCounts}
          mergeCandidates={mergeCandidates}
        />
      )}

      {proposedName && isAdmin && (
        <Panel className="mb-6">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="min-w-0">
              <h2 className="text-base font-semibold text-sage-800">Structure this branch account</h2>
              <p className="text-xs text-sage-600 mt-1">
                Set the display name to <span className="font-medium text-sage-800">{proposedName}</span> and keep the
                parent brand (<span className="font-medium text-sage-800">{vm.name}</span>) and branch
                (<span className="font-medium text-sage-800">{vm.company_name}</span>) in their own fields. Nothing is
                flattened, and quotes/jobs/invoices stay linked.
              </p>
            </div>
            <ApplyProposedNameButton clientId={vm.id} proposedName={proposedName} />
          </div>
        </Panel>
      )}

      {branchAccounts.length > 0 && isAdmin && (
        <Panel className="mb-6">
          <h2 className="text-base font-semibold text-sage-800 mb-2">Related branch accounts</h2>
          <p className="text-xs text-sage-600 mb-3">
            These share the same parent brand but appear to be separate branches. <strong>Do not merge</strong> unless
            you are sure they are the same account.
          </p>
          <ul className="divide-y divide-sage-100">
            {branchAccounts
              .filter((d) => d && typeof d.id === 'string')
              .map((d) => (
                <li key={d.id} className="py-2.5 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <Link href={`/portal/clients/${d.id}`} className="text-sage-800 font-medium hover:underline">
                      {(typeof d.name === 'string' && d.name) || 'Unnamed client'}
                    </Link>
                    <p className="text-xs text-sage-500 mt-0.5">
                      {d.company_name ? <>{d.company_name} · </> : null}
                      {d.email ? <>{d.email}</> : null}
                    </p>
                  </div>
                  <span className="shrink-0 text-[10px] uppercase tracking-wide font-semibold text-sage-600 bg-sage-100 rounded-full px-2 py-0.5">
                    Branch
                  </span>
                </li>
              ))}
          </ul>
        </Panel>
      )}

      {duplicates.length > 0 && isAdmin && (
        <Panel variant="warning" className="mb-6">
          <h2 className="text-base font-semibold text-amber-900 mb-2">Possible duplicates</h2>
          <p className="text-xs text-amber-800 mb-3">
            These active clients share an email, phone number, or the same name <em>and</em> branch. Use Merge above only
            if they are genuinely the same account.
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
        </Panel>
      )}

      {/* Phase 5.5.6 — Client portal access (mirror of contractor 5.5.3). */}
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

      <div className="mb-4 text-xs text-sage-600 bg-sage-50 border border-sage-100 rounded-lg px-4 py-3 max-w-2xl">
        This record is the <strong>account</strong>. For a branch like Barfoot &amp; Thompson, the account name should be
        the branch (e.g. <em>Barfoot &amp; Thompson - Ellerslie</em>). Add the property managers, agents or booking
        contacts as <strong>Contacts</strong> — they&apos;re chosen per quote so emails greet the right person.
      </div>

      <ClientForm
        client={{
          id: vm.id,
          name: vm.name === 'Unnamed client' ? '' : vm.name,
          company_name: vm.company_name,
          branch_name: vm.branch_name,
          email: vm.email,
          phone: vm.phone,
          service_address: vm.service_address,
          billing_address: vm.billing_address,
          billing_same_as_service: vm.billing_same_as_service,
          notes: vm.notes,
        }}
      />

      {/* Phase 5.5.7 — Activity timeline (audit_log; read-only). */}
      <Panel title="Activity" padding="md" className="mt-6">
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
      </Panel>
    </div>
  )
}
