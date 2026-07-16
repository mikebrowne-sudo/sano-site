// Public, token-keyed print view of a signed agreement — the render target
// for the PDF attached to the confirmation email. The token IS the auth
// (same model as /share/*); no portal chrome (root layout only).

import { notFound } from 'next/navigation'
import { getServiceSupabase } from '@/lib/supabase-service'
import { EmploymentAgreementDocument } from '@/components/EmploymentAgreementDocument'

export const dynamic = 'force-dynamic'

export default async function AgreementTokenPrintPage({ params }: { params: { token: string } }) {
  const svc = getServiceSupabase()
  const { data: a } = await svc.from('employment_agreements').select('*').eq('token', params.token).maybeSingle()
  if (!a) notFound()

  return (
    <div className="bg-white p-8 max-w-3xl mx-auto">
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
  )
}
