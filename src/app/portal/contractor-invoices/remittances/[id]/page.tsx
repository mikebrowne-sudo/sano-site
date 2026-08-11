// Staff preview of a created remittance batch. Shows the branded
// document, the print/PDF actions, and the admin Email-remittance action.

import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ExternalLink, Printer, Download, CheckCircle2, Pencil } from 'lucide-react'
import { createClient } from '@/lib/supabase-server'
import { isAdminUser } from '@/lib/is-admin'
import { getRemittanceBatchById } from '@/lib/contractor-remittance-data'
import { ContractorRemittanceDocument } from '@/components/ContractorRemittanceDocument'
import { PrintButton } from '@/components/PrintButton'
import { SendRemittanceButton } from '@/components/SendRemittanceButton'
import { VoidControl } from '../../_components/VoidControl'
import { RemittancePaidControl } from '../../_components/RemittancePaidControl'
import { formatCurrency, formatDateTime } from '@/lib/format'
import { BackLink } from '../../../_components/BackLink'

export const dynamic = 'force-dynamic'

export default async function RemittanceBatchViewPage({ params }: { params: { id: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!isAdminUser(user)) notFound()

  const data = await getRemittanceBatchById(params.id)
  if (!data) notFound()

  return (
    <div className="max-w-4xl mx-auto">
      <BackLink fallbackHref="/portal/contractor-invoices" label="Back to contractor invoices" />

      <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
        <div>
          <h1 className="text-2xl font-bold text-sage-800 tracking-tight">Remittance {data.remittanceNumber}</h1>
          <p className="text-sm text-sage-500 mt-0.5 tnum">
            {(data.payeeLabel || data.contractorNames.join(' & ')) && <span>{data.payeeLabel || data.contractorNames.join(' & ')} · </span>}
            {data.lines.length} line{data.lines.length === 1 ? '' : 's'} · <span className="font-semibold text-sage-800">{formatCurrency(data.total)}</span>
          </p>
        </div>
        <div className="flex flex-col items-end gap-1.5">
          <div className="flex items-center gap-2">
            <a href={`/remittance-batch/${data.token}`} target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-2 border border-sage-200 text-sage-700 font-medium px-4 py-2.5 rounded-lg text-sm hover:bg-sage-50 transition-colors">
              <ExternalLink size={15} /> Open share page
            </a>
            <Link href={`/portal/contractor-invoices/remittances/${data.id}/edit`}
              className="inline-flex items-center gap-2 border border-sage-200 text-sage-700 font-medium px-4 py-2.5 rounded-lg text-sm hover:bg-sage-50 transition-colors">
              <Pencil size={15} /> Edit
            </Link>
            <PrintButton label="Print" className="inline-flex items-center gap-2 border border-sage-200 text-sage-700 font-medium px-4 py-2.5 rounded-lg text-sm hover:bg-sage-50 transition-colors" />
            <a href={`/api/contractor-invoices/remittances/${data.id}/pdf`} target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-2 bg-sage-500 text-white font-semibold px-4 py-2.5 rounded-lg text-sm hover:bg-sage-700 transition-colors">
              <Download size={15} /> Download PDF
            </a>
            <SendRemittanceButton id={data.id} sentAt={data.sentAt} />
          </div>
          <p className="inline-flex items-start gap-1.5 text-[11px] text-sage-500 max-w-[340px] text-left leading-snug">
            <Printer size={13} className="mt-0.5 shrink-0 text-sage-400" />
            <span><span className="font-medium text-sage-600">Download PDF</span> gives a clean file with no browser headers. Browser <span className="font-medium">Print</span> adds them unless you turn off <span className="font-medium">Headers and footers</span> in More settings.</span>
          </p>
        </div>
      </div>

      {data.sentAt && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3 mb-5 text-xs text-emerald-800 flex items-center gap-2">
          <CheckCircle2 size={14} /> Sent to the contractor on {formatDateTime(data.sentAt)}.
        </div>
      )}

      {/* Paid state — created unpaid; mark paid once the money leaves the bank. */}
      <div className="mb-5">
        <RemittancePaidControl id={data.id} paidAt={data.paidAt} paymentDate={data.paymentDate} />
      </div>

      {/* Reversal — void this batch (reverts its payables to approved so
          they can be corrected). Use only when no money has left the bank. */}
      <div className="mb-5">
        <VoidControl kind="remittance" id={data.id} redirectTo="/portal/contractor-invoices" />
      </div>

      {/* Branded document preview */}
      <div className="rounded-2xl overflow-hidden border border-sage-100">
        <ContractorRemittanceDocument data={data} />
      </div>
    </div>
  )
}
