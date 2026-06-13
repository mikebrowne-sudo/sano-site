// Presentational body of the contractor profile screen. Shared by the
// live page and the staff preview. In `readOnly` (preview) mode the
// sign-out button is omitted and the training link is inert.

import Link from 'next/link'
import { User, Mail, Phone, ExternalLink } from 'lucide-react'
import { ContractorSignOutButton } from '../_components/ContractorSignOutButton'

export interface ContractorProfile {
  full_name: string
  email?: string | null
  phone?: string | null
  worker_type?: string | null
}

export function ContractorProfileView({
  contractor,
  readOnly = false,
}: {
  contractor: ContractorProfile
  readOnly?: boolean
}) {
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
            <p className="text-sage-800 font-semibold truncate">{contractor.full_name}</p>
            {contractor.worker_type && (
              <p className="text-xs text-sage-500 capitalize">{contractor.worker_type}</p>
            )}
          </div>
        </div>

        <dl className="space-y-3 text-sm">
          {contractor.email && (
            <div className="flex items-center gap-3">
              <Mail size={16} className="text-sage-400 shrink-0" />
              <dt className="sr-only">Email</dt>
              <dd className="text-sage-800 truncate">{contractor.email}</dd>
            </div>
          )}
          {contractor.phone && (
            <div className="flex items-center gap-3">
              <Phone size={16} className="text-sage-400 shrink-0" />
              <dt className="sr-only">Phone</dt>
              <dd className="text-sage-800">{contractor.phone}</dd>
            </div>
          )}
        </dl>

        <p className="mt-4 text-xs text-sage-500">To update your details, contact Sano.</p>
      </div>

      {readOnly ? (
        <div className="block bg-white rounded-2xl border border-sage-100 px-5 py-4">
          <div className="flex items-center justify-between">
            <span className="text-sage-800 font-medium">Training</span>
            <ExternalLink size={16} className="text-sage-400" />
          </div>
          <p className="text-xs text-sage-500 mt-0.5">View modules and your training progress.</p>
        </div>
      ) : (
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
      )}

      {!readOnly && <ContractorSignOutButton />}
    </div>
  )
}
