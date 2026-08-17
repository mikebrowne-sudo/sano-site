// Staff preview of a created remittance batch. Shows the branded
// document, the print/PDF actions, and the admin Email-remittance action.

import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ExternalLink, Download, CheckCircle2, Pencil, Landmark } from 'lucide-react'
import clsx from 'clsx'
import { createClient } from '@/lib/supabase-server'
import { isAdminUser } from '@/lib/is-admin'
import { getRemittanceBatchById } from '@/lib/contractor-remittance-data'
import { ContractorRemittanceDocument } from '@/components/ContractorRemittanceDocument'
import { PrintButton } from '@/components/PrintButton'
import { SendRemittanceButton } from '@/components/SendRemittanceButton'
import { VoidControl } from '../../_components/VoidControl'
import { RemittancePaidControl } from '../../_components/RemittancePaidControl'
import { formatCurrency, formatDate, formatDateTime } from '@/lib/format'
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
            {/* Browser Print adds page headers/footers unless they're turned
                off in More settings — Download PDF gives a clean file. */}
            <PrintButton label="Print" className="inline-flex items-center gap-2 border border-sage-200 text-sage-700 font-medium px-4 py-2.5 rounded-lg text-sm hover:bg-sage-50 transition-colors" />
            <a href={`/api/contractor-invoices/remittances/${data.id}/pdf`} target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-2 bg-sage-500 text-white font-semibold px-4 py-2.5 rounded-lg text-sm hover:bg-sage-700 transition-colors">
              <Download size={15} /> Download PDF
            </a>
            <SendRemittanceButton id={data.id} sentAt={data.sentAt} />
          </div>
        </div>
      </div>

      {/* ONE status row — paid state, bank confirmation, sent state and the
          void escape hatch on a single line. These were four stacked
          full-width banners, which pushed the actual remittance document
          below the fold on every visit. */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-xl border border-gray-100 bg-white px-4 py-2.5 mb-5">
        <RemittancePaidControl id={data.id} paidAt={data.paidAt} paymentDate={data.paymentDate} />

        {/* Bank confirmation — a DIFFERENT fact from "paid". Read-only here;
            matching happens only in /portal/finance/reconcile-out. */}
        {data.paidAt && (
          data.paymentConfirmed ? (
            <span className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 font-medium whitespace-nowrap"
              title={`Matched to outgoing bank payment${data.paymentConfirmedAt ? ` on ${formatDate(data.paymentConfirmedAt)}` : ''}`}>
              <Landmark size={13} /> Bank confirmed
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 text-xs whitespace-nowrap">
              <span className={clsx(
                'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full font-medium',
                data.allocatedTotal > 0 ? 'bg-amber-50 text-amber-800' : 'bg-sage-100 text-sage-600',
              )}>
                <Landmark size={13} />
                {data.allocatedTotal > 0
                  ? `Partly confirmed · ${formatCurrency(data.allocatedTotal)} of ${formatCurrency(data.total)}`
                  : 'Awaiting bank confirmation'}
              </span>
              <Link href="/portal/finance/reconcile-out" className="text-sage-500 hover:text-sage-700 underline">
                Reconcile
              </Link>
            </span>
          )
        )}

        {data.sentAt && (
          <span className="inline-flex items-center gap-1.5 text-xs text-sage-500 whitespace-nowrap"
            title={`Sent to the contractor on ${formatDateTime(data.sentAt)}`}>
            <CheckCircle2 size={13} className="text-emerald-600" /> Sent
          </span>
        )}

        <span className="ml-auto">
          <VoidControl kind="remittance" id={data.id} redirectTo="/portal/contractor-invoices" />
        </span>
      </div>

      {/* Branded document preview */}
      <div className="rounded-2xl overflow-hidden border border-sage-100">
        <ContractorRemittanceDocument data={data} />
      </div>
    </div>
  )
}
