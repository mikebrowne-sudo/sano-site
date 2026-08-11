import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase-server'
import { isAdminUser } from '@/lib/is-admin'
import { ExpenseForm, type ExpenseData } from '../_components/ExpenseForm'
import { getVendorSuggestions } from '../_data'
import { BackLink } from '../../_components/BackLink'

export default async function NewExpensePage({
  searchParams,
}: {
  searchParams: { amount?: string; date?: string; ref?: string; vendor?: string; returnTo?: string }
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

  // Where to return after Back / save — the caller's origin (e.g. reconcile) or
  // the expenses list by default. Only allow same-site relative paths.
  const returnTo = searchParams.returnTo && searchParams.returnTo.startsWith('/portal/')
    ? searchParams.returnTo
    : '/portal/expenses'

  return (
    <div>
      <BackLink fallbackHref={returnTo} />
      <h1 className="text-2xl font-bold text-sage-800 mb-8">Add expense</h1>
      <ExpenseForm expense={prefill} vendorSuggestions={vendorSuggestions} returnTo={returnTo} />
    </div>
  )
}
