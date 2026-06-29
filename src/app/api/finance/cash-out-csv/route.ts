// Combined "cash out" CSV — admin-only. Contractor payments + expenses in
// one file with a Type column so the accountant can pivot/filter. Optional
// ?from=&to= date range. Read-only; no logic touched.

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { isFinanceEmail } from '@/lib/is-admin'
import { buildCsv, csvResponse, fmtCsvDate } from '@/lib/csv'
import { expenseCategoryLabel } from '@/lib/expense-categories'

export const dynamic = 'force-dynamic'

interface PayableRow {
  invoice_number: string | null
  amount: number | null
  status: string | null
  date_submitted: string | null
  date_paid: string | null
  payment_type: string | null
  site_label: string | null
  contractors: { full_name: string | null } | null
  jobs: { job_number: string | null } | null
}
interface ExpenseRow {
  expense_date: string | null
  amount: number | null
  category: string | null
  vendor: string | null
  payment_reference: string | null
}
type OutRow = { type: string; date: string; party: string; detail: string; amount: number; reference: string; status: string }

export async function GET(request: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!isFinanceEmail(user.email)) return NextResponse.json({ error: 'Admin only' }, { status: 403 })

  const sp = new URL(request.url).searchParams
  const from = sp.get('from')
  const to = sp.get('to')

  let payQ = supabase
    .from('contractor_invoices')
    .select('invoice_number, amount, status, date_submitted, date_paid, payment_type, site_label, contractors ( full_name ), jobs ( job_number )')
  if (from) payQ = payQ.gte('date_submitted', from)
  if (to) payQ = payQ.lte('date_submitted', to)

  let expQ = supabase
    .from('expenses')
    .select('expense_date, amount, category, vendor, payment_reference')
  if (from) expQ = expQ.gte('expense_date', from)
  if (to) expQ = expQ.lte('expense_date', to)

  const [{ data: payData, error: payErr }, { data: expData, error: expErr }] = await Promise.all([payQ, expQ])
  if (payErr) return NextResponse.json({ error: payErr.message }, { status: 500 })
  if (expErr) return NextResponse.json({ error: expErr.message }, { status: 500 })

  const out: OutRow[] = []
  for (const p of (payData as unknown as PayableRow[] ?? [])) {
    const isFixed = p.payment_type === 'fixed_contract'
    out.push({
      type: 'Contractor payment',
      date: fmtCsvDate(p.date_paid || p.date_submitted),
      party: p.contractors?.full_name ?? '',
      detail: isFixed ? (p.site_label ?? '') : (p.jobs?.job_number ?? ''),
      amount: p.amount ?? 0,
      reference: p.invoice_number ?? '',
      status: p.status ?? '',
    })
  }
  for (const e of (expData as unknown as ExpenseRow[] ?? [])) {
    out.push({
      type: 'Expense',
      date: fmtCsvDate(e.expense_date),
      party: e.vendor ?? '',
      detail: expenseCategoryLabel(e.category),
      amount: e.amount ?? 0,
      reference: e.payment_reference ?? '',
      status: '',
    })
  }
  out.sort((a, b) => (b.date || '').localeCompare(a.date || ''))

  const csv = buildCsv(
    ['Type', 'Date', 'Party', 'Job / category', 'Amount', 'Reference', 'Status'],
    out.map((r) => [r.type, r.date, r.party, r.detail, r.amount, r.reference, r.status]),
  )

  const suffix = from || to ? `-${from ?? 'start'}-to-${to ?? 'now'}` : ''
  return csvResponse(csv, `sano-cash-out${suffix}.csv`)
}
