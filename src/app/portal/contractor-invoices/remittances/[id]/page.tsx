// Staff preview of a created remittance batch. Shows the branded
// document + a link to open/print the PDF version. Sending is NOT wired
// up here (deferred) — this is preview/generate only.

import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, ExternalLink, FileText, Printer } from 'lucide-react'
import { createClient } from '@/lib/supabase-server'
import { isAdminUser } from '@/lib/is-admin'
import { getRemittanceBatchById } from '@/lib/contractor-remittance-data'
import { ContractorRemittanceDocument } from '@/components/ContractorRemittanceDocument'
import { PrintButton } from '@/components/PrintButton'
import { formatCurrency } from '@/lib/format'

export const dynamic = 'force-dynamic'

export default async function RemittanceBatchViewPage({ params }: { params: { id: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!isAdminUser(user)) notFound()

  const data = await getRemittanceBatchById(params.id)
  if (!data) notFound()

  return (
    <div className="max-w-4xl mx-auto">
      <Link href="/portal/contractor-invoices" className="inline-flex items-center gap-1.5 text-sm text-sage-600 hover:text-sage-800 mb-4">
        <ArrowLeft size={14} /> Back to contractor invoices
      </Link>

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
            <PrintButton label="Print / save PDF" />
          </div>
          <p className="inline-flex items-start gap-1.5 text-[11px] text-amber-800 bg-amber-50 border border-amber-200 rounded-md px-2.5 py-1.5 max-w-[300px] text-left leading-snug">
            <Printer size={13} className="mt-0.5 shrink-0" />
            <span>Before saving as PDF, open <span className="font-semibold">More settings</span> and turn off <span className="font-semibold">Headers and footers</span>.</span>
          </p>
        </div>
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 mb-5 text-xs text-amber-800 flex items-center gap-2">
        <FileText size={14} /> Preview only — sending to the contractor by email is not enabled yet. Confirm when you&apos;re ready and it can be wired up.
      </div>

      {/* Branded document preview */}
      <div className="rounded-2xl overflow-hidden border border-sage-100">
        <ContractorRemittanceDocument data={data} />
      </div>
    </div>
  )
}
