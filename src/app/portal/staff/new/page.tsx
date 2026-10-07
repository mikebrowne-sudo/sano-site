import { StaffForm } from '../_components/StaffForm'
import { BackLink } from '../../_components/BackLink'

export default function NewStaffPage() {
  return (
    <div className="max-w-3xl">
      <BackLink fallbackHref="/portal/staff" label="All staff" />
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
