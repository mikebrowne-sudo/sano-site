import { createClient } from '@/lib/supabase-server'
import { notFound } from 'next/navigation'
import { ClientForm } from '../_components/ClientForm'
import { DeleteButton } from '../../_components/DeleteButton'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

export default async function ClientDetailPage({ params }: { params: { id: string } }) {
  const supabase = createClient()

  const { data: client, error } = await supabase
    .from('clients')
    .select('id, name, company_name, email, phone, service_address, billing_address, billing_same_as_service, notes')
    .eq('id', params.id)
    .single()

  if (error || !client) notFound()

  const { data: { user } } = await supabase.auth.getUser()
  const isAdmin = user?.email === 'michael@sano.nz'

  return (
    <div>
      <Link
        href="/portal/clients"
        className="inline-flex items-center gap-1.5 text-sm text-sage-600 hover:text-sage-800 transition-colors mb-4"
      >
        <ArrowLeft size={14} />
        Back to clients
      </Link>

      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold text-sage-800">{client.name}</h1>
        {isAdmin && <DeleteButton type="client" id={client.id} />}
      </div>

      <ClientForm client={client} />
    </div>
  )
}
