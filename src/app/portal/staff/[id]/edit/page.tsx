import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { createClient } from '@/lib/supabase-server'
import { StaffForm } from '../../_components/StaffForm'

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
      <Link
        href={`/portal/staff/${params.id}`}
        className="inline-flex items-center gap-1 text-sm text-sage-600 hover:text-sage-800 mb-4"
      >
        <ArrowLeft size={14} /> Back to staff record
      </Link>
      <h1 className="text-3xl tracking-tight font-bold text-sage-800 mb-6">Edit staff</h1>
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
        <StaffForm staff={s as never} />
      </div>
    </div>
  )
}
