import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Link2 } from 'lucide-react'
import { createClient } from '@/lib/supabase-server'
import { isAdminUser } from '@/lib/is-admin'
import { EmploymentAgreementDocument } from '@/components/EmploymentAgreementDocument'
import { CopyLinkButton } from './_components/CopyLinkButton'

export const dynamic = 'force-dynamic'

export default async function AgreementDetailPage({ params }: { params: { id: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!isAdminUser(user)) notFound()

  const { data: a } = await supabase.from('employment_agreements').select('*').eq('id', params.id).maybeSingle()
  if (!a) notFound()

  const origin = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://sano.nz'
  const link = `${origin}/agreement/${a.token}`
  const signed = a.status === 'signed'

  return (
    <div className="max-w-3xl">
      <Link href="/portal/agreements" className="inline-flex items-center gap-1.5 text-sm text-sage-600 hover:text-sage-800 mb-4">
        <ArrowLeft size={14} /> Employment agreements
      </Link>

      {!signed && (
        <div className="rounded-xl border border-sage-200 bg-white p-5 mb-6">
          <p className="flex items-center gap-2 text-sm font-semibold text-sage-800 mb-2"><Link2 size={15} className="text-sage-500" /> Send this link to {a.person_label || 'the employee'}</p>
          <CopyLinkButton url={link} />
          <p className="text-[11px] text-sage-400 mt-2">They open it, fill their details, and e-sign. You&apos;ll see the signed copy here.</p>
        </div>
      )}

      <div className="rounded-2xl border border-gray-100 shadow-sm p-6">
        <EmploymentAgreementDocument
          a={{
            type: a.agreement_type === 'contractor' ? 'contractor' : 'casual_employee',
            position: a.position, hourlyRate: a.hourly_rate, startDate: a.start_date,
            employeeFullName: a.employee_full_name, employeeAddress: a.employee_address,
            employeeIrdNumber: a.employee_ird_number, taxCode: a.tax_code, kiwisaverChoice: a.kiwisaver_choice,
            contractorTradingName: a.contractor_trading_name, contractorGstNumber: a.contractor_gst_number,
            signedName: a.signed_name, signedAt: a.signed_at,
          }}
        />
      </div>
    </div>
  )
}
