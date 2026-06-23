// Invoice register CSV export — admin-only. Optional ?from=&to= on issue date.
//
// Read-only over existing invoices; no invoice logic touched. Total =
// base_price - discount + sum(invoice_items.price), matching the portal's
// invoice total convention.

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { isAdminEmail } from '@/lib/is-admin'
import { buildCsv, csvResponse, fmtCsvDate } from '@/lib/csv'

export const dynamic = 'force-dynamic'

interface Row {
  invoice_number: string | null
  status: string | null
  base_price: number | null
  discount: number | null
  date_issued: string | null
  due_date: string | null
  date_paid: string | null
  clients: { name: string | null; company_name: string | null } | null
  invoice_items: { price: number | null }[] | null
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
    .from('invoices')
    .select('invoice_number, status, base_price, discount, date_issued, due_date, date_paid, clients ( name, company_name ), invoice_items ( price )')
    .is('deleted_at', null)
    .neq('is_test', true)
    .order('date_issued', { ascending: false })
  if (from) query = query.gte('date_issued', from)
  if (to) query = query.lte('date_issued', to)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const today = new Date().toISOString().slice(0, 10)
  const rows = (data as unknown as Row[] ?? [])
  const csv = buildCsv(
    ['Invoice #', 'Client', 'Issued', 'Due', 'Status', 'Paid date', 'Total'],
    rows.map((r) => {
      const items = (r.invoice_items ?? []).reduce((s, i) => s + (i.price ?? 0), 0)
      const total = Math.round(((r.base_price ?? 0) - (r.discount ?? 0) + items) * 100) / 100
      const status = r.status === 'sent' && r.due_date && r.due_date < today ? 'overdue' : (r.status ?? '')
      return [
        r.invoice_number ?? '',
        r.clients?.company_name || r.clients?.name || '',
        fmtCsvDate(r.date_issued),
        fmtCsvDate(r.due_date),
        status,
        fmtCsvDate(r.date_paid),
        total,
      ]
    }),
  )

  const suffix = from || to ? `-${from ?? 'start'}-to-${to ?? 'now'}` : ''
  return csvResponse(csv, `sano-invoice-register${suffix}.csv`)
}
