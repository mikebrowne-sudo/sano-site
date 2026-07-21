import { getContractor } from '../../_lib/get-contractor'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { ContractorStatementSnapshot } from '@/components/ContractorStatementSnapshot'
import type { IssuedSnapshot } from '@/lib/contractor-statement-snapshot'

export const dynamic = 'force-dynamic'

export default async function ContractorStatementDetailPage({ params }: { params: { id: string } }) {
  const { supabase, contractor } = await getContractor()

  // RLS already restricts to this contractor's issued+ statements; we re-check
  // ownership and require a snapshot (drafts have none) as defence in depth.
  const { data: stmt } = await supabase
    .from('contractor_statements')
    .select('id, contractor_id, status, issued_snapshot')
    .eq('id', params.id)
    .maybeSingle()

  if (!stmt || stmt.contractor_id !== contractor.id || !stmt.issued_snapshot) notFound()

  return (
    <div>
      <Link href="/contractor/statements" className="inline-flex items-center gap-1.5 text-sm text-sage-600 hover:text-sage-800 transition-colors mb-4">
        <ArrowLeft size={14} /> Back to statements
      </Link>
      <ContractorStatementSnapshot snapshot={stmt.issued_snapshot as IssuedSnapshot} superseded={stmt.status === 'superseded'} />
    </div>
  )
}
