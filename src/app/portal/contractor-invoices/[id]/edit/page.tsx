import { createClient } from '@/lib/supabase-server'
import { notFound } from 'next/navigation'
import { CIForm } from '../../_components/CIForm'
import { evaluatePayableEdit, flattenRef, type RemittanceRef } from '@/lib/contractor-payable-guard'
import { Lock } from 'lucide-react'
import { BackLink } from '../../../_components/BackLink'

export default async function EditContractorInvoicePage({ params }: { params: { id: string } }) {
  const supabase = createClient()

  const [{ data: ci, error }, { data: contractors }, { data: jobs }, { data: linkRaw }] = await Promise.all([
    supabase.from('contractor_invoices').select('id, invoice_number, contractor_id, job_id, amount, date_submitted, notes, status, date_paid, payment_type, site_label, period_label').eq('id', params.id).single(),
    supabase.from('contractors').select('id, full_name').eq('status', 'active').order('full_name'),
    // Job picker — no row cap. See sibling `new/page.tsx` for context.
    supabase.from('jobs').select('id, job_number, title').order('job_number', { ascending: false }),
    supabase.from('contractor_remittance_items').select('remittance_id, contractor_remittances ( sent_at )').eq('contractor_invoice_id', params.id),
  ])

  if (error || !ci) notFound()

  const remittances = ((linkRaw ?? []) as unknown as Array<{ contractor_remittances: RemittanceRef }>)
    .map((r) => ({ sent: !!flattenRef(r.contractor_remittances)?.sent_at }))
  const guard = evaluatePayableEdit({ status: ci.status, datePaid: ci.date_paid, remittances })

  const back = (
    <BackLink fallbackHref={`/portal/contractor-invoices/${params.id}`} />
  )

  if (!guard.editable) {
    return (
      <div>
        {back}
        <h1 className="text-2xl font-bold text-sage-800 mb-6">Edit Contractor Payable</h1>
        <div className="max-w-2xl flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-5 py-4">
          <Lock size={18} className="text-amber-600 mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-semibold text-amber-900 mb-1">This payable is locked for editing.</p>
            <p className="text-sm text-amber-800">{guard.message}</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div>
      {back}
      <h1 className="text-2xl font-bold text-sage-800 mb-8">Edit Contractor Payable</h1>
      <CIForm
        ci={{ id: ci.id, contractor_id: ci.contractor_id, job_id: ci.job_id, amount: ci.amount, date_submitted: ci.date_submitted, notes: ci.notes, payment_type: ci.payment_type, site_label: ci.site_label, period_label: ci.period_label }}
        contractors={contractors ?? []}
        jobs={jobs ?? []}
      />
    </div>
  )
}
