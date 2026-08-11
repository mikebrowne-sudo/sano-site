// Contractor-select remittance builder — pick contractors, and each (with a
// couple's shared-GST company combined) gets one remittance for their unpaid
// jobs with a uniform KRITIKAPAYROLLDDMMYY reference. Admin-only.

import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase-server'
import { isAdminUser } from '@/lib/is-admin'
import { BackLink } from '../../../_components/BackLink'
import { ContractorRemittanceBuilder, type ContractorRow } from './_components/ContractorRemittanceBuilder'

export const dynamic = 'force-dynamic'

export default async function NewByContractorPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!isAdminUser(user)) notFound()

  const [{ data: contractors }, { data: ciRaw }, { data: remitted }] = await Promise.all([
    supabase.from('contractors').select('id, full_name, company_name, gst_number').order('full_name'),
    supabase.from('contractor_invoices').select('id, contractor_id, amount').eq('status', 'approved'),
    supabase.from('contractor_remittance_items').select('contractor_invoice_id').not('contractor_invoice_id', 'is', null),
  ])

  const remittedSet = new Set((remitted ?? []).map((r) => r.contractor_invoice_id as string))
  const unpaid = new Map<string, { count: number; total: number }>()
  for (const ci of ciRaw ?? []) {
    if (remittedSet.has(ci.id as string)) continue
    const cur = unpaid.get(ci.contractor_id as string) ?? { count: 0, total: 0 }
    cur.count += 1
    cur.total += Number(ci.amount)
    unpaid.set(ci.contractor_id as string, cur)
  }

  const rows: ContractorRow[] = (contractors ?? [])
    .map((c) => {
      const u = unpaid.get(c.id as string)
      return {
        id: c.id as string,
        name: (c.full_name as string | null) ?? '—',
        company: (c.company_name as string | null) ?? null,
        gstNumber: (c.gst_number as string | null) ?? null,
        unpaidCount: u?.count ?? 0,
        unpaidTotal: Math.round((u?.total ?? 0) * 100) / 100,
      }
    })
    .filter((r) => r.unpaidCount > 0)

  return (
    <div className="max-w-3xl mx-auto">
      <BackLink fallbackHref="/portal/contractor-invoices" label="Back to contractor invoices" />
      <h1 className="text-3xl font-bold text-sage-800 tracking-tight mb-1">Remittance by contractor</h1>
      <p className="text-sm text-sage-500 mb-6">Select who you&rsquo;re paying. Each contractor (a couple sharing a company is combined) gets one remittance covering their unpaid jobs, with a uniform reference. Nothing is sent — this creates the remittances to review.</p>

      <ContractorRemittanceBuilder contractors={rows} />
    </div>
  )
}
