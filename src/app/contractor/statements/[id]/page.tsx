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
    .select('id, contractor_id, status, issued_snapshot, review_due_at, confirmed_at, confirmed_source')
    .eq('id', params.id)
    .maybeSingle()

  if (!stmt || stmt.contractor_id !== contractor.id || !stmt.issued_snapshot) notFound()

  // Record the first view (idempotent; owner + non-draft enforced inside the RPC).
  await supabase.rpc('mark_statement_viewed', { p_statement_id: params.id })

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

      <ContractorStatementSnapshot snapshot={stmt.issued_snapshot as IssuedSnapshot} superseded={stmt.status === 'superseded'} />
    </div>
  )
}
