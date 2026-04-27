'use client'

// Phase 5.5.11 — /portal/clients/new now hosts the NewClientModal in
// inline mode. Replaces the old single-row ClientForm at this URL —
// the form is still used for editing on /portal/clients/[id].

import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { NewClientModal } from '../_components/NewClientModal'

export default function NewClientPage() {
  const router = useRouter()
  return (
    <div>
      <Link
        href="/portal/clients"
        className="inline-flex items-center gap-1.5 text-sm text-sage-600 hover:text-sage-800 transition-colors mb-4"
      >
        <ArrowLeft size={14} />
        Back to clients
      </Link>

      <h1 className="text-2xl font-bold text-sage-800 mb-2">New client</h1>
      <p className="text-sm text-sage-500 mb-6">
        One quick form for the client, primary contact, accounts contact, and payment setup.
      </p>

      <NewClientModal
        inline
        onCreated={(id) => router.push(`/portal/clients/${id}`)}
        onCancel={() => router.push('/portal/clients')}
      />
    </div>
  )
}
