import Link from 'next/link'
import { redirect } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { createClient } from '@/lib/supabase-server'
import { CustomInvoiceForm } from '../../_components/CustomInvoiceForm'

const ADMIN_EMAIL = 'michael@sano.nz'

export default async function NewCustomInvoicePage() {
  const supabase = createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user || user.email !== ADMIN_EMAIL) {
    redirect('/portal/invoices')
  }

  const { data: clients } = await supabase
    .from('clients')
    .select('id, name, company_name')
    .eq('is_archived', false)
    .order('name')

  return (
    <div>
      <Link
        href="/portal/invoices"
        className="inline-flex items-center gap-1.5 text-sm text-sage-600 hover:text-sage-800 transition-colors mb-4"
      >
        <ArrowLeft size={14} />
        Back to invoices
      </Link>

      <div className="mb-6">
        <h1 className="text-2xl font-bold text-sage-800">New custom invoice</h1>
        <p className="text-sm text-sage-600 mt-1 max-w-2xl">
          For pre-portal / legacy cases. Use only when reproducing an invoice that was originally
          issued outside the portal. Standard quotes and jobs flow through the normal create paths.
        </p>
      </div>

      <CustomInvoiceForm clients={clients ?? []} />
    </div>
  )
}
