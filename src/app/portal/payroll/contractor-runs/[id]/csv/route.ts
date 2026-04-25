// Phase E.1 — contractor pay run CSV export.
//
// GET /portal/payroll/contractor-runs/[id]/csv
//   Admin-only. Returns text/csv with one row per pay_run_item.
//   Columns: contractor name, contractor email, job number, job
//   title, job date, approved hours, pay rate, amount.
//
// Quoting: each cell is wrapped in double quotes and any internal
// double quotes are doubled (RFC 4180). Newlines inside titles are
// flattened to a single space so a malformed line doesn't break
// the row count.

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { isAdminEmail } from '@/lib/is-admin'

export const dynamic = 'force-dynamic'

type ItemRow = {
  approved_hours: number | null
  pay_rate: number | null
  amount: number | null
  contractors: { full_name: string | null; email: string | null } | null
  jobs: {
    job_number: string | null
    title: string | null
    scheduled_date: string | null
  } | null
}

function csvCell(input: string | number | null): string {
  if (input == null) return ''
  const s = String(input).replace(/[\r\n]+/g, ' ')
  // Always quote — keeps the parser happy with commas/quotes/spaces.
  return `"${s.replace(/"/g, '""')}"`
}

function fmtDateForCsv(iso: string | null): string {
  if (!iso) return ''
  // ISO date is unambiguous in spreadsheets.
  return iso.slice(0, 10)
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  const supabase = createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  if (!isAdminEmail(user.email)) {
    return NextResponse.json({ error: 'Admin only' }, { status: 403 })
  }

  // Validate the run + load period for the filename.
  const { data: run, error: runErr } = await supabase
    .from('pay_runs')
    .select('id, kind, pay_period_start, pay_period_end, status')
    .eq('id', params.id)
    .single()
  if (runErr || !run) {
    return NextResponse.json({ error: 'Pay run not found' }, { status: 404 })
  }
  if (run.kind !== 'contractor') {
    return NextResponse.json({ error: 'Not a contractor pay run' }, { status: 400 })
  }

  const { data: rowsRaw } = await supabase
    .from('pay_run_items')
    .select(`
      approved_hours, pay_rate, amount,
      contractors ( full_name, email ),
      jobs ( job_number, title, scheduled_date )
    `)
    .eq('pay_run_id', params.id)
    .order('contractor_id')

  const rows = (rowsRaw ?? []) as unknown as ItemRow[]

  const header = [
    'Contractor name',
    'Contractor email',
    'Job number',
    'Job title',
    'Job date',
    'Approved hours',
    'Pay rate',
    'Amount',
  ].map(csvCell).join(',')

  const lines = rows.map((r) => [
    csvCell(r.contractors?.full_name ?? ''),
    csvCell(r.contractors?.email ?? ''),
    csvCell(r.jobs?.job_number ?? ''),
    csvCell(r.jobs?.title ?? ''),
    csvCell(fmtDateForCsv(r.jobs?.scheduled_date ?? null)),
    csvCell(r.approved_hours ?? 0),
    csvCell(r.pay_rate ?? 0),
    csvCell(r.amount ?? 0),
  ].join(','))

  const csv = [header, ...lines].join('\r\n') + '\r\n'

  // Filename: contractor-pay-run-{period_start}-to-{period_end}.csv
  const start = run.pay_period_start?.toString().slice(0, 10) ?? 'period'
  const end   = run.pay_period_end?.toString().slice(0, 10)   ?? 'period'
  const filename = `contractor-pay-run-${start}-to-${end}.csv`.replace(/[^\w.\-]+/g, '_')

  return new NextResponse(csv, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'no-store',
    },
  })
}
