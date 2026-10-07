// Contractor tax remediation CSV export (PR 10) — finance-only, READ-ONLY.
// Exports the same findings as the on-screen report for manual review. Reads
// historical contractor records only; writes nothing, corrects nothing.

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { isFinanceEmail } from '@/lib/is-admin'
import { buildCsv, csvResponse, fmtCsvDate } from '@/lib/csv'
import { loadRemediationReport } from '@/app/portal/finance/contractor-tax-remediation/_lib/load-remediation'

export const dynamic = 'force-dynamic'

export async function GET() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!isFinanceEmail(user.email)) return NextResponse.json({ error: 'Admin only' }, { status: 403 })

  const { findings } = await loadRemediationReport(supabase)

  const csv = buildCsv(
    ['Severity', 'Finding code', 'Entity', 'Record ref', 'Contractor', 'Amount', 'Supply date', 'What is missing', 'Required action'],
    findings.map((f) => [
      f.severity,
      f.code,
      f.entity,
      f.entityRef ?? f.entityId,
      f.contractorName ?? '',
      f.amount == null ? '' : f.amount.toFixed(2),
      fmtCsvDate(f.supplyDate),
      f.detail,
      f.requiredAction,
    ]),
  )
  return csvResponse(csv, 'sano-contractor-tax-remediation.csv')
}
