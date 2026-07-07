// Employment agreements — admin list + create. Send the private link to the
// employee to complete + e-sign; the signed record is stored here.

import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, FileSignature, CheckCircle2, Clock } from 'lucide-react'
import { createClient } from '@/lib/supabase-server'
import { isAdminUser } from '@/lib/is-admin'
import { CreateAgreementForm } from './_components/CreateAgreementForm'
import { formatDate } from '@/lib/format'

export const dynamic = 'force-dynamic'

export default async function AgreementsPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!isAdminUser(user)) notFound()

  const { data: agreements } = await supabase
    .from('employment_agreements')
    .select('id, person_label, position, status, signed_at, created_at, agreement_type')
    .order('created_at', { ascending: false })

  return (
    <div className="max-w-3xl">
      <Link href="/portal/settings" className="inline-flex items-center gap-1.5 text-sm text-sage-600 hover:text-sage-800 mb-4">
        <ArrowLeft size={14} /> Settings
      </Link>
      <h1 className="text-3xl font-bold text-sage-800 tracking-tight mb-1">Employment agreements</h1>
      <p className="text-sm text-sage-500 mb-6">Create a casual employment agreement, send the private link to the employee, and store their signed copy.</p>

      <div className="mb-8"><CreateAgreementForm /></div>

      <h2 className="text-[11px] font-semibold uppercase tracking-wider text-sage-500 mb-2 px-1">Agreements</h2>
      {(!agreements || agreements.length === 0) ? (
        <div className="rounded-2xl border border-dashed border-sage-200 bg-sage-50/50 p-8 text-center text-sm text-sage-500">
          <FileSignature size={24} className="mx-auto text-sage-300 mb-2" /> None yet.
        </div>
      ) : (
        <div className="rounded-2xl border border-gray-100 bg-white overflow-hidden divide-y divide-sage-50">
          {agreements.map((a) => (
            <Link key={a.id} href={`/portal/agreements/${a.id}`} className="flex items-center justify-between px-5 py-3.5 hover:bg-sage-50/60">
              <div>
                <div className="text-sm font-medium text-sage-800">
                  {a.person_label || 'Employee'}
                  <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded-full bg-sage-100 text-sage-600 font-medium">{a.agreement_type === 'contractor' ? 'Contractor' : 'Casual employee'}</span>
                </div>
                <div className="text-[11px] text-sage-500">created {formatDate(a.created_at)}</div>
              </div>
              {a.status === 'signed' ? (
                <span className="inline-flex items-center gap-1.5 text-[11px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-medium">
                  <CheckCircle2 size={12} /> Signed {a.signed_at ? formatDate(a.signed_at) : ''}
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 text-[11px] px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 font-medium">
                  <Clock size={12} /> Awaiting signature
                </span>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
