// Bare print view of an employment/contractor agreement — the render
// target for the PDF route (src/app/api/agreements/[id]/pdf). Portal chrome
// is print:hidden, so the PDF captures just the document.

import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase-server'
import { isAdminUser } from '@/lib/is-admin'
import { EmploymentAgreementDocument } from '@/components/EmploymentAgreementDocument'

export const dynamic = 'force-dynamic'

export default async function AgreementPrintPage({ params }: { params: { id: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!isAdminUser(user)) notFound()

  const { data: a } = await supabase.from('employment_agreements').select('*').eq('id', params.id).maybeSingle()
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
