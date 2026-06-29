// Expenses CSV export — admin-only. Optional ?from=&to= date range.

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { isFinanceEmail } from '@/lib/is-admin'
import { buildCsv, csvResponse, fmtCsvDate } from '@/lib/csv'
import { expenseCategoryLabel } from '@/lib/expense-categories'

export const dynamic = 'force-dynamic'

interface Row {
  expense_date: string | null
  amount: number | null
  category: string | null
  vendor: string | null
  description: string | null
  payment_reference: string | null
  gst_inclusive: boolean | null
  notes: string | null
}

export async function GET(request: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!isFinanceEmail(user.email)) return NextResponse.json({ error: 'Admin only' }, { status: 403 })

  const sp = new URL(request.url).searchParams
  const from = sp.get('from')
  const to = sp.get('to')

  let query = supabase
    .from('expenses')
    .select('expense_date, amount, category, vendor, description, payment_reference, gst_inclusive, notes')
    .order('expense_date', { ascending: false })
  if (from) query = query.gte('expense_date', from)
  if (to) query = query.lte('expense_date', to)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const rows = (data as unknown as Row[] ?? [])
  const csv = buildCsv(
    ['Date', 'Category', 'Vendor', 'Description', 'Amount', 'GST inclusive', 'Payment reference', 'Notes'],
    rows.map((r) => [
      fmtCsvDate(r.expense_date),
      expenseCategoryLabel(r.category),
      r.vendor ?? '',
      r.description ?? '',
      r.amount ?? 0,
      r.gst_inclusive === false ? 'No' : 'Yes',
      r.payment_reference ?? '',
      r.notes ?? '',
    ]),
  )

  const suffix = from || to ? `-${from ?? 'start'}-to-${to ?? 'now'}` : ''
  return csvResponse(csv, `sano-expenses${suffix}.csv`)
}
