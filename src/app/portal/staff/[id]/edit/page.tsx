import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase-server'
import { StaffForm } from '../../_components/StaffForm'
import { BackLink } from '../../../_components/BackLink'

export default async function EditStaffPage({ params }: { params: { id: string } }) {
  const supabase = createClient()
  const { data: s, error } = await supabase
    .from('staff')
    .select('id, full_name, email, role')
    .eq('id', params.id)
    .maybeSingle()
  if (error || !s) notFound()

  return (
    <div className="max-w-3xl">
      <BackLink fallbackHref={`/portal/staff/${params.id}`} label="Back to staff record" />
      <h1 className="text-3xl tracking-tight font-bold text-sage-800 mb-6">Edit staff</h1>
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
        <StaffForm staff={s as never} />
      </div>
    </div>
  )
}
