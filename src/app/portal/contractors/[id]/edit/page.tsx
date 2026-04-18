import { createClient } from '@/lib/supabase-server'
import { notFound } from 'next/navigation'
import { ContractorForm } from '../../_components/ContractorForm'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

export default async function EditContractorPage({ params }: { params: { id: string } }) {
  const supabase = createClient()

  const { data: contractor, error } = await supabase
    .from('contractors')
    .select('id, full_name, email, phone, hourly_rate, base_hourly_rate, loaded_hourly_rate, holiday_pay_percent, status, worker_type, notes, start_date, end_date, pay_frequency, standard_hours, holiday_pay_method, ird_number, tax_code, ir330_received, kiwisaver_enrolled, kiwisaver_employee_rate, kiwisaver_employer_rate, insurance_provider, insurance_policy_number, insurance_expiry, insurance_liability_cover, company_name, business_structure, nzbn, gst_registered, gst_number, bank_account_name, bank_account_number, payment_terms_days, contract_signed_date, right_to_work_required, right_to_work_expiry, service_areas, approved_services, availability_notes, has_vehicle, provides_own_equipment, key_holding_approved, alarm_access_approved, pet_friendly, experience_level, can_lead_jobs, can_work_solo, can_supervise_others, invite_sent_at, portal_access_active, auth_user_id')
    .eq('id', params.id)
    .single()

  if (error || !contractor) notFound()

  return (
    <div>
      <Link
        href={`/portal/contractors/${params.id}`}
        className="inline-flex items-center gap-1.5 text-sm text-sage-600 hover:text-sage-800 transition-colors mb-4"
      >
        <ArrowLeft size={14} />
        Back to contractor
      </Link>

      <h1 className="text-2xl font-bold text-sage-800 mb-8">Edit {contractor.full_name}</h1>

      <ContractorForm contractor={contractor} />
    </div>
  )
}
