import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { createClient } from '@/lib/supabase-server'
import { isAdminUser } from '@/lib/is-admin'
import { ExpenseForm } from '../_components/ExpenseForm'
import { getVendorSuggestions } from '../_data'

export default async function NewExpensePage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!isAdminUser(user)) notFound()

  const vendorSuggestions = await getVendorSuggestions()

  return (
    <div>
      <Link href="/portal/expenses" className="inline-flex items-center gap-1.5 text-sm text-sage-600 hover:text-sage-800 transition-colors mb-4"><ArrowLeft size={14} /> Back</Link>
      <h1 className="text-2xl font-bold text-sage-800 mb-8">Add expense</h1>
      <ExpenseForm vendorSuggestions={vendorSuggestions} />
    </div>
  )
}
