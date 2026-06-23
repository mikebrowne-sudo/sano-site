// Contractor payments CSV export — admin-only. Optional ?from=&to= on
// submitted date. Read-only over contractor_invoices + remittance links;
// no payable/remittance logic touched.

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { isAdminEmail } from '@/lib/is-admin'
import { buildCsv, csvResponse, fmtCsvDate } from '@/lib/csv'

export const dynamic = 'force-dynamic'

interface PayableRow {
  id: string
  invoice_number: string | null
  amount: number | null
  status: string | null
  date_submitted: string | null
  date_paid: string | null
  payment_type: string | null
  site_label: string | null
  period_label: string | null
  contractors: { full_name: string | null } | null
  jobs: { job_number: string | null } | null
}

interface LinkRow {
  contractor_invoice_id: string | null
  contractor_remittances: { remittance_number: string | null; payment_date: string | null; reference: string | null } | null
}

export async function GET(request: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!isAdminEmail(user.email)) return NextResponse.json({ error: 'Admin only' }, { status: 403 })

  const sp = new URL(request.url).searchParams
  const from = sp.get('from')
  const to = sp.get('to')

  let query = supabase
    .from('contractor_invoices')
    .select('id, invoice_number, amount, status, date_submitted, date_paid, payment_type, site_label, period_label, contractors ( full_name ), jobs ( job_number )')
    .order('date_submitted', { ascending: false })
  if (from) query = query.gte('date_submitted', from)
  if (to) query = query.lte('date_submitted', to)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  const payables = (data as unknown as PayableRow[] ?? [])

  // Map each payable to its remittance (if snapshotted into one).
  const { data: linkData } = await supabase
    .from('contractor_remittance_items')
    .select('contractor_invoice_id, contractor_remittances ( remittance_number, payment_date, reference )')
    .not('contractor_invoice_id', 'is', null)
  const links = (linkData as unknown as LinkRow[] ?? [])
  const remitByCi = new Map<string, LinkRow['contractor_remittances']>()
  for (const l of links) {
    if (l.contractor_invoice_id && l.contractor_remittances) remitByCi.set(l.contractor_invoice_id, l.contractor_remittances)
  }

  const csv = buildCsv(
    ['CI #', 'Contractor', 'Payment type', 'Job / site', 'Period', 'Amount', 'Status', 'Submitted', 'Paid date', 'Remittance #', 'Remittance ref'],
    payables.map((p) => {
      const isFixed = p.payment_type === 'fixed_contract'
      const remit = remitByCi.get(p.id) ?? null
      return [
        p.invoice_number ?? '',
        p.contractors?.full_name ?? '',
        isFixed ? 'Fixed contract' : 'Standard',
        isFixed ? (p.site_label ?? '') : (p.jobs?.job_number ?? ''),
        p.period_label ?? '',
        p.amount ?? 0,
        p.status ?? '',
        fmtCsvDate(p.date_submitted),
        fmtCsvDate(p.date_paid),
        remit?.remittance_number ?? '',
        remit?.reference ?? '',
      ]
    }),
  )

  const suffix = from || to ? `-${from ?? 'start'}-to-${to ?? 'now'}` : ''
  return csvResponse(csv, `sano-contractor-payments${suffix}.csv`)
}
