import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { StaffForm } from '../_components/StaffForm'

export default function NewStaffPage() {
  return (
    <div className="max-w-3xl">
      <Link
        href="/portal/staff"
        className="inline-flex items-center gap-1 text-sm text-sage-600 hover:text-sage-800 mb-4"
      >
        <ArrowLeft size={14} /> All staff
      </Link>
      <h1 className="text-3xl tracking-tight font-bold text-sage-800 mb-2">New staff member</h1>
      <p className="text-sm text-sage-600 mb-6">
        Create the record first, then send an invite from the staff detail page. The invite email contains a one-time link to set their password.
      </p>
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
        <StaffForm />
      </div>
    </div>
  )
}
