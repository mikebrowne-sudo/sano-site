// Job-margins CSV export (finance-only, READ-ONLY). Same rows as the on-screen
// report: completed jobs with labour-based gross margin. Optional ?from=&to=.

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { isFinanceEmail } from '@/lib/is-admin'
import { buildCsv, csvResponse, fmtCsvDate } from '@/lib/csv'
import { resolvePeriod } from '@/app/portal/finance/_lib/periods'
import { buildJobMarginReport, type InvoicedFilter, type MarginSort } from '@/app/portal/finance/_lib/job-margins'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!isFinanceEmail(user.email)) return NextResponse.json({ error: 'Admin only' }, { status: 403 })

  const url = new URL(request.url)
  const { from, to } = resolvePeriod(url.searchParams.get('period') ?? 'ytd', url.searchParams.get('from') ?? undefined, url.searchParams.get('to') ?? undefined)
  const invRaw = url.searchParams.get('invoiced')
  const invoiced: InvoicedFilter = invRaw === 'invoiced' || invRaw === 'not_invoiced' ? invRaw : 'all'
  const sortRaw = url.searchParams.get('sort')
  const sort: MarginSort = sortRaw === 'margin_desc' || sortRaw === 'margin_asc' ? sortRaw : 'default'
  const { rows, totals } = await buildJobMarginReport(supabase, {
    from, to, invoiced, sort, customerId: url.searchParams.get('customer') || null,
  })

  const csv = buildCsv(
    ['Job', 'Title', 'Customer', 'Completed', 'Price', 'Labour cost', 'Gross profit', 'Margin %', 'Needs review'],
    [
      ...rows.map((r) => [
        r.jobNumber ?? '', r.title ?? '', r.client ?? '', fmtCsvDate(r.completedAt),
        r.jobPrice.toFixed(2), r.labourCost.toFixed(2), r.grossProfit.toFixed(2), String(r.marginPercent),
        r.needsCostReview ? (r.workerCount === 0 ? 'No contractor assigned' : 'No hours/rate set') : '',
      ]),
      ['TOTAL', `${totals.jobs} jobs`, '', '', totals.price.toFixed(2), totals.labourCost.toFixed(2), totals.grossProfit.toFixed(2), String(totals.marginPercent), `${totals.needsReview} need review`],
    ],
  )
  return csvResponse(csv, 'sano-job-margins.csv')
}
