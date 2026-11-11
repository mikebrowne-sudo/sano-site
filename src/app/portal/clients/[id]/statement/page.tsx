import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase-server'
import { isAdminUser } from '@/lib/is-admin'
import { PortalPageHeader } from '../../../_components/PortalPageHeader'
import { loadOutstandingStatementLines } from '@/lib/statement-data'
import { buildStatementEmail, statementTotal } from '@/lib/statements'
import { resolveGreeting } from '@/lib/email-greeting'
import { SendStatementForm } from './_components/SendStatementForm'

export const dynamic = 'force-dynamic'

export default async function SendStatementPage({ params }: { params: { id: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!isAdminUser(user)) notFound()

  const { data: client } = await supabase
    .from('clients')
    .select('id, name, email, accounts_email, invoice_cc_emails, autopay_status')
    .eq('id', params.id)
    .maybeSingle()
  if (!client) notFound()

  const [lines, { data: contact }, { data: past }] = await Promise.all([
    loadOutstandingStatementLines(supabase, params.id),
    supabase.from('contacts').select('full_name').eq('client_id', params.id).eq('contact_type', 'primary').maybeSingle(),
    supabase.from('statements').select('statement_number, sent_at, total, share_token').eq('client_id', params.id).not('sent_at', 'is', null).order('sent_at', { ascending: false }).limit(5),
  ])

  const greeting = resolveGreeting([(contact?.full_name as string | null) ?? null, client.name as string | null], null)
  const autopayActive = client.autopay_status === 'active'
  const draft = buildStatementEmail({ greeting, total: statementTotal(lines), count: lines.length, autopayActive })

  return (
    <div>
      <PortalPageHeader
        backHref={`/portal/clients/${params.id}`}
        backLabel={`Back to ${client.name}`}
        title="Send statement"
        subtitle={`${client.name}: one email with every outstanding invoice, their PDFs, and one payment reference.`}
      />
      <SendStatementForm
        clientId={params.id}
        lines={lines}
        defaultTo={((client.accounts_email || client.email) as string | null)?.trim() ?? ''}
        defaultAlsoTo={((client.invoice_cc_emails as string[] | null) ?? []).join(', ')}
        greeting={greeting}
        defaultSubject={draft.subject}
        defaultMessage={draft.message}
        autopayStatus={(client.autopay_status as string | null) ?? 'none'}
        past={((past ?? []) as { statement_number: string; sent_at: string; total: number; share_token: string }[])}
      />
    </div>
  )
}
