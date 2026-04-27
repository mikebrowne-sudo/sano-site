import { createClient } from '@/lib/supabase-server'
import { notFound } from 'next/navigation'
import { ClientForm } from '../_components/ClientForm'
import { DeleteButton } from '../../_components/DeleteButton'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { ClientAccessPanel } from './_components/ClientAccessPanel'
import { loadWorkforceSettings } from '@/lib/workforce-settings'

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

  const { data: client, error } = await supabase
    .from('clients')
    .select('id, name, company_name, email, phone, service_address, billing_address, billing_same_as_service, notes, auth_user_id, invite_sent_at, invite_accepted_at, access_disabled_at, access_disabled_reason')
    .eq('id', params.id)
    .single()

  if (error || !client) notFound()

  const { data: { user } } = await supabase.auth.getUser()
  const isAdmin = user?.email === 'michael@sano.nz'

  const [settings, { data: auditRows }] = await Promise.all([
    loadWorkforceSettings(supabase),
    supabase
      .from('audit_log')
      .select('id, action, created_at')
      .eq('entity_table', 'clients')
      .eq('entity_id', params.id)
      .order('created_at', { ascending: false })
      .limit(50),
  ])
  const audit: AuditEntry[] = (auditRows ?? []) as AuditEntry[]

  return (
    <div>
      <Link
        href="/portal/clients"
        className="inline-flex items-center gap-1.5 text-sm text-sage-600 hover:text-sage-800 transition-colors mb-4"
      >
        <ArrowLeft size={14} />
        Back to clients
      </Link>

      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold text-sage-800">{client.name}</h1>
        {isAdmin && <DeleteButton type="client" id={client.id} />}
      </div>

      {/* Phase 5.5.6 — Client portal access (mirror of contractor 5.5.3). */}
      <ClientAccessPanel
        clientId={client.id as string}
        email={(client.email as string | null) ?? null}
        authUserId={(client as { auth_user_id?: string | null }).auth_user_id ?? null}
        inviteSentAt={(client as { invite_sent_at?: string | null }).invite_sent_at ?? null}
        inviteAcceptedAt={(client as { invite_accepted_at?: string | null }).invite_accepted_at ?? null}
        accessDisabledAt={(client as { access_disabled_at?: string | null }).access_disabled_at ?? null}
        accessDisabledReason={(client as { access_disabled_reason?: string | null }).access_disabled_reason ?? null}
        featureEnabled={settings.enable_customer_portal}
      />

      <ClientForm
        client={{
          id: client.id as string,
          name: client.name as string,
          company_name: (client.company_name as string | null) ?? null,
          email: (client.email as string | null) ?? null,
          phone: (client.phone as string | null) ?? null,
          service_address: (client.service_address as string | null) ?? null,
          billing_address: (client.billing_address as string | null) ?? null,
          billing_same_as_service: (client.billing_same_as_service as boolean | null) ?? true,
          notes: (client.notes as string | null) ?? null,
        }}
      />

      {/* Phase 5.5.7 — Activity timeline (audit_log; read-only). */}
      <div className="bg-white rounded-2xl border border-sage-100 shadow-sm p-6 mt-6">
        <h2 className="text-base font-semibold text-sage-800 mb-3">Activity</h2>
        {audit.length === 0 ? (
          <p className="text-sm text-sage-500">No history yet.</p>
        ) : (
          <ul className="divide-y divide-sage-50">
            {audit.map((e) => (
              <li key={e.id} className="py-2.5">
                <div className="flex items-start justify-between gap-3">
                  <p className="text-sm font-medium text-sage-800">{ACTION_LABELS[e.action] ?? e.action}</p>
                  <p className="text-[11px] text-sage-500 whitespace-nowrap">{fmtDateTime(e.created_at)}</p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
