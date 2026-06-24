import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { createClient } from '@/lib/supabase-server'
import { isAdminUser } from '@/lib/is-admin'
import { notFound } from 'next/navigation'
import { ReconcileClient } from './_components/ReconcileClient'

export const dynamic = 'force-dynamic'

export default async function ReconcilePage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!isAdminUser(user)) notFound()

  return (
    <div className="max-w-4xl">
      <Link href="/portal/finance" className="inline-flex items-center gap-1.5 text-sm text-sage-600 hover:text-sage-800 transition-colors mb-4"><ArrowLeft size={14} /> Finance</Link>
      <h1 className="text-3xl tracking-tight font-bold text-sage-800 mb-2">Bank reconciliation</h1>
      <p className="text-sm text-sage-500 mb-8">Upload an ASB CSV export to see which credits match your invoices and which debits are recorded as expenses. Read-only — nothing is saved.</p>
      <ReconcileClient />
    </div>
  )
}
