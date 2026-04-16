import { ClientForm } from '../_components/ClientForm'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

export default function NewClientPage() {
  return (
    <div>
      <Link
        href="/portal/clients"
        className="inline-flex items-center gap-1.5 text-sm text-sage-600 hover:text-sage-800 transition-colors mb-4"
      >
        <ArrowLeft size={14} />
        Back to clients
      </Link>

      <h1 className="text-2xl font-bold text-sage-800 mb-8">New Client</h1>

      <ClientForm />
    </div>
  )
}
