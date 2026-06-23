import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { createClient } from '@/lib/supabase-server'
import { isAdminUser } from '@/lib/is-admin'
import { ExpenseForm, type ExpenseData } from '../../_components/ExpenseForm'

export const dynamic = 'force-dynamic'

export default async function EditExpensePage({ params }: { params: { id: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!isAdminUser(user)) notFound()

  const { data: e, error } = await supabase
    .from('expenses')
    .select('id, expense_date, amount, category, vendor, description, payment_reference, gst_inclusive, notes')
    .eq('id', params.id)
    .single()

  if (error || !e) notFound()

  const expense: ExpenseData = {
    id: e.id as string,
    expense_date: (e.expense_date as string) ?? '',
    amount: (e.amount as number) ?? 0,
    category: (e.category as string) ?? 'other',
    vendor: (e.vendor as string | null) ?? null,
    description: (e.description as string | null) ?? null,
    payment_reference: (e.payment_reference as string | null) ?? null,
    gst_inclusive: (e.gst_inclusive as boolean | null) ?? true,
    notes: (e.notes as string | null) ?? null,
  }

  return (
    <div>
      <Link href="/portal/expenses" className="inline-flex items-center gap-1.5 text-sm text-sage-600 hover:text-sage-800 transition-colors mb-4"><ArrowLeft size={14} /> Back</Link>
      <h1 className="text-2xl font-bold text-sage-800 mb-8">Edit expense</h1>
      <ExpenseForm expense={expense} />
    </div>
  )
}
