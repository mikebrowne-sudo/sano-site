// Separate admin edit screen for a remittance advice. Kept off the clean
// remittance view on purpose — this is the manual "make the document
// match the contractor" escape hatch (see _actions-remittance-edit.ts).

import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase-server'
import { isAdminUser } from '@/lib/is-admin'
import { BackLink } from '../../../../_components/BackLink'
import { RemittanceEditForm } from './_components/RemittanceEditForm'

export const dynamic = 'force-dynamic'

export default async function EditRemittancePage({ params }: { params: { id: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!isAdminUser(user)) notFound()

  const [{ data: header }, { data: items }] = await Promise.all([
    supabase
      .from('contractor_remittances')
      .select('id, remittance_number, payee_label, reference, payment_date, notes, sent_at')
      .eq('id', params.id)
      .single(),
    supabase
      .from('contractor_remittance_items')
      .select('id, kind, contractor_name, job_number, job_address, note, label, hours, amount, sort')
      .eq('remittance_id', params.id)
      .order('sort', { ascending: true }),
  ])

  if (!header) notFound()

  return (
    <div className="max-w-4xl mx-auto">
      <BackLink fallbackHref={`/portal/contractor-invoices/remittances/${params.id}`} label="Back to remittance" />

      <h1 className="text-2xl font-bold text-sage-800 tracking-tight mb-1">
        Edit {header.remittance_number}
      </h1>
      <p className="text-sm text-sage-500 mb-6">Manual correction of the advice document — amounts stay locked.</p>

      <RemittanceEditForm
        id={header.id as string}
        remittanceNumber={header.remittance_number as string}
        wasSent={(header.sent_at as string | null) != null}
        header={{
          payeeLabel: (header.payee_label as string | null) ?? null,
          reference: (header.reference as string | null) ?? null,
          paymentDate: (header.payment_date as string | null) ?? null,
          notes: (header.notes as string | null) ?? null,
        }}
        lines={(items ?? []).map((it) => ({
          id: it.id as string,
          kind: (it.kind as string | null) ?? 'invoice',
          contractorName: (it.contractor_name as string | null) ?? null,
          jobNumber: (it.job_number as string | null) ?? null,
          jobAddress: (it.job_address as string | null) ?? null,
          note: (it.note as string | null) ?? null,
          label: (it.label as string | null) ?? null,
          hours: (it.hours as number | null) ?? null,
          amount: (it.amount as number) ?? 0,
        }))}
      />
    </div>
  )
}
