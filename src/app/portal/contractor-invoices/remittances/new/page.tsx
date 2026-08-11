// Build a contractor remittance batch — select invoices (across
// contractors for household payments), set payment date + reference,
// add adjustment lines, preview the total, create. Admin-only.
// Does not send anything.

import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase-server'
import { isAdminUser } from '@/lib/is-admin'
import { BackLink } from '../../../_components/BackLink'
import { RemittanceBatchBuilder, type BuilderCI } from './_components/RemittanceBatchBuilder'

export const dynamic = 'force-dynamic'

interface RawCI {
  id: string
  invoice_number: string | null
  amount: number | null
  status: string | null
  date_paid: string | null
  notes: string | null
  contractor_id: string | null
  contractors: { full_name: string | null } | null
  jobs: { job_number: string | null; address: string | null } | null
}

export default async function NewRemittanceBatchPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!isAdminUser(user)) notFound()

  const [{ data: ciRaw }, { data: contractorOpts }] = await Promise.all([
    supabase
      .from('contractor_invoices')
      .select('id, invoice_number, amount, status, date_paid, notes, contractor_id, contractors ( full_name ), jobs ( job_number, address )')
      .neq('status', 'void')
      .order('created_at', { ascending: false }),
    supabase.from('contractors').select('id, full_name').order('full_name'),
  ])

  const cis: BuilderCI[] = (ciRaw as unknown as RawCI[] ?? []).map((ci) => ({
    id: ci.id,
    number: ci.invoice_number ?? '—',
    contractorId: ci.contractor_id,
    contractor: ci.contractors?.full_name ?? '—',
    jobNumber: ci.jobs?.job_number ?? null,
    jobAddress: ci.jobs?.address ?? null,
    note: ci.notes?.trim() || null,
    amount: ci.amount ?? 0,
    status: ci.status ?? 'pending',
    datePaid: ci.date_paid ?? null,
  }))

  return (
    <div className="max-w-4xl mx-auto">
      <BackLink fallbackHref="/portal/contractor-invoices" label="Back to contractor invoices" />
      <h1 className="text-3xl font-bold text-sage-800 tracking-tight mb-1">New remittance batch</h1>
      <p className="text-sm text-sage-500 mb-6">Select the invoices paid in one bank payment, set the date + reference, and add any adjustment lines. Nothing is sent — this creates a preview you can review.</p>

      <RemittanceBatchBuilder cis={cis} contractors={(contractorOpts ?? []).map((c) => ({ id: c.id as string, name: c.full_name as string }))} />
    </div>
  )
}
