import { getContractor } from '../../_lib/get-contractor'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { ContractorStatementSnapshot } from '@/components/ContractorStatementSnapshot'
import type { IssuedSnapshot } from '@/lib/contractor-statement-snapshot'
import { ConfirmSection } from '../_components/ConfirmSection'

export const dynamic = 'force-dynamic'

export default async function ContractorStatementDetailPage({ params }: { params: { id: string } }) {
  const { supabase, contractor } = await getContractor()

  // RLS restricts to this contractor's issued+ statements; re-check ownership
  // and require a snapshot (drafts have none) as defence in depth.
  const { data: stmt } = await supabase
    .from('contractor_statements')
    .select('id, contractor_id, status, issued_snapshot, review_due_at, confirmed_at, confirmed_source, remittance_id, contractor_remittances(remittance_number, paid_at)')
    .eq('id', params.id)
    .maybeSingle()

  if (!stmt || stmt.contractor_id !== contractor.id || !stmt.issued_snapshot) notFound()

  // Record the first view (idempotent; owner + non-draft enforced inside the RPC).
  await supabase.rpc('mark_statement_viewed', { p_statement_id: params.id })

  const remRaw = stmt.contractor_remittances as unknown
  const rem = (Array.isArray(remRaw) ? remRaw[0] : remRaw) as { remittance_number: string | null; paid_at: string | null } | null
  const paid = stmt.status === 'paid' && !!rem?.paid_at
  const paymentPending = !!stmt.remittance_id && !paid

  return (
    <div>
      <Link href="/contractor/statements" className="inline-flex items-center gap-1.5 text-sm text-sage-600 hover:text-sage-800 transition-colors mb-4">
        <ArrowLeft size={14} /> Back to statements
      </Link>

      <ConfirmSection
        id={params.id}
        status={stmt.status as string}
        reviewDueAt={(stmt.review_due_at as string | null) ?? null}
        confirmedAt={(stmt.confirmed_at as string | null) ?? null}
        confirmedSource={(stmt.confirmed_source as string | null) ?? null}
      />

      {(paid || paymentPending) && (
        <div className={`rounded-xl border p-4 mb-6 text-sm ${paid ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-sage-200 bg-sage-50 text-sage-700'}`}>
          {paid
            ? <p><span className="font-semibold">Paid</span> on {new Date(rem!.paid_at as string).toLocaleDateString('en-NZ', { day: 'numeric', month: 'long', year: 'numeric' })}{rem?.remittance_number ? ` · remittance ${rem.remittance_number}` : ''}.</p>
            : <p><span className="font-semibold">Payment pending.</span> Your statement has been processed for payment{rem?.remittance_number ? ` (remittance ${rem.remittance_number})` : ''}.</p>}
        </div>
      )}

      <ContractorStatementSnapshot snapshot={stmt.issued_snapshot as IssuedSnapshot} superseded={stmt.status === 'superseded'} />
    </div>
  )
}
