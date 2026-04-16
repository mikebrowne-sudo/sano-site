import { createClient } from '@/lib/supabase-server'
import { NewQuoteForm } from './_components/NewQuoteForm'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

export default async function NewQuotePage() {
  const supabase = createClient()

  const { data: clients } = await supabase
    .from('clients')
    .select('id, name, company_name, email, phone, service_address, billing_address, billing_same_as_service')
    .order('name')

  return (
    <div>
      <Link
        href="/portal/quotes"
        className="inline-flex items-center gap-1.5 text-sm text-sage-600 hover:text-sage-800 transition-colors mb-4"
      >
        <ArrowLeft size={14} />
        Back to quotes
      </Link>

      <h1 className="text-2xl font-bold text-sage-800 mb-8">New Quote</h1>

      <NewQuoteForm clients={clients ?? []} />
    </div>
  )
}
