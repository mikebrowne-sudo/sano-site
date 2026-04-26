// Phase 5.5.4 — Contractor profile page.
//
// Read-only view for the contractor: name, contact info, sign-out.
// Edits stay admin-only at /portal/contractors/[id] for now; we can
// surface contractor-side editing in a later phase.

import { getContractor } from '../_lib/get-contractor'
import Link from 'next/link'
import { User, Mail, Phone, ExternalLink } from 'lucide-react'
import { ContractorSignOutButton } from '../_components/ContractorSignOutButton'

export default async function ContractorProfilePage() {
  const { supabase, contractor } = await getContractor()

  const { data: full } = await supabase
    .from('contractors')
    .select('id, full_name, email, phone, status, worker_type')
    .eq('id', contractor.id)
    .single()

  const c = full ?? contractor

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-sage-800">Profile</h1>
        <p className="text-sage-500 text-sm mt-0.5">Your Sano contractor account.</p>
      </div>

      <div className="bg-white rounded-2xl border border-sage-100 p-5">
        <div className="flex items-center gap-3 mb-4">
          <div className="inline-flex w-12 h-12 items-center justify-center rounded-full bg-sage-100">
            <User size={22} className="text-sage-700" />
          </div>
          <div className="min-w-0">
            <p className="text-sage-800 font-semibold truncate">{c.full_name}</p>
            {(c as { worker_type?: string }).worker_type && (
              <p className="text-xs text-sage-500 capitalize">{(c as { worker_type?: string }).worker_type}</p>
            )}
          </div>
        </div>

        <dl className="space-y-3 text-sm">
          {(c as { email?: string | null }).email && (
            <div className="flex items-center gap-3">
              <Mail size={16} className="text-sage-400 shrink-0" />
              <dt className="sr-only">Email</dt>
              <dd className="text-sage-800 truncate">{(c as { email?: string | null }).email}</dd>
            </div>
          )}
          {(c as { phone?: string | null }).phone && (
            <div className="flex items-center gap-3">
              <Phone size={16} className="text-sage-400 shrink-0" />
              <dt className="sr-only">Phone</dt>
              <dd className="text-sage-800">{(c as { phone?: string | null }).phone}</dd>
            </div>
          )}
        </dl>

        <p className="mt-4 text-xs text-sage-500">
          To update your details, contact Sano.
        </p>
      </div>

      <Link
        href="/contractor/training"
        className="block bg-white rounded-2xl border border-sage-100 px-5 py-4 hover:border-sage-300 active:bg-sage-50 transition-colors"
      >
        <div className="flex items-center justify-between">
          <span className="text-sage-800 font-medium">Training</span>
          <ExternalLink size={16} className="text-sage-400" />
        </div>
        <p className="text-xs text-sage-500 mt-0.5">View modules and your training progress.</p>
      </Link>

      <ContractorSignOutButton />
    </div>
  )
}
