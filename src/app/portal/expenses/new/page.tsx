import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { createClient } from '@/lib/supabase-server'
import { isAdminUser } from '@/lib/is-admin'
import { ExpenseForm, type ExpenseData } from '../_components/ExpenseForm'
import { getVendorSuggestions } from '../_data'

export default async function NewExpensePage({
  searchParams,
}: {
  searchParams: { amount?: string; date?: string; ref?: string; vendor?: string }
}) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!isAdminUser(user)) notFound()

  const vendorSuggestions = await getVendorSuggestions()

  // Optional prefill (e.g. from the bank reconciliation "Add expense" link).
  const amount = searchParams.amount ? parseFloat(searchParams.amount) : NaN
  const hasPrefill = !!(searchParams.amount || searchParams.date || searchParams.ref || searchParams.vendor)
  const prefill: ExpenseData | undefined = hasPrefill
    ? {
        expense_date: searchParams.date || new Date().toISOString().slice(0, 10),
        amount: Number.isFinite(amount) ? amount : 0,
        category: 'other',
        vendor: searchParams.vendor || null,
        description: null,
        payment_reference: searchParams.ref || null,
        gst_inclusive: true,
        notes: null,
      }
    : undefined

  return (
    <div>
      <Link href="/portal/expenses" className="inline-flex items-center gap-1.5 text-sm text-sage-600 hover:text-sage-800 transition-colors mb-4"><ArrowLeft size={14} /> Back</Link>
      <h1 className="text-2xl font-bold text-sage-800 mb-8">Add expense</h1>
      <ExpenseForm expense={prefill} vendorSuggestions={vendorSuggestions} />
    </div>
  )
}
