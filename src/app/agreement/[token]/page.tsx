// Public (token-keyed) employment-agreement page — the employee reads the
// agreement, fills their details, and e-signs. No login (service-role read).

import { notFound } from 'next/navigation'
import { CheckCircle2 } from 'lucide-react'
import { getServiceSupabase } from '@/lib/supabase-service'
import { EmploymentAgreementDocument } from '@/components/EmploymentAgreementDocument'
import { SignAgreementForm } from './_components/SignAgreementForm'

export const dynamic = 'force-dynamic'

export default async function PublicAgreementPage({ params }: { params: { token: string } }) {
  const svc = getServiceSupabase()
  const { data: a } = await svc.from('employment_agreements').select('*').eq('token', params.token).maybeSingle()
  if (!a) notFound()
  const signed = a.status === 'signed'

  return (
    <div className="min-h-screen bg-sage-50/40 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        {signed && (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 mb-5 flex items-center gap-2 text-sm text-emerald-800">
            <CheckCircle2 size={16} className="shrink-0" /> Thanks — your agreement is signed. Keep this page for your records.
          </div>
        )}

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-6">
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

        {!signed && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <SignAgreementForm token={params.token} type={a.agreement_type === 'contractor' ? 'contractor' : 'casual_employee'} />
          </div>
        )}
      </div>
    </div>
  )
}
