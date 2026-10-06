// Accountant pack — the period's books as one Excel workbook (.xlsx).
// Finance users only (admins + accountants). Read-only.
//
// Reads through the service-role client AFTER the finance check, so an
// accountant login gets the same complete pack as an admin (some finance
// tables are admin-only under RLS). Every query is a SELECT.
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { getServiceSupabase } from '@/lib/supabase-service'
import { isFinanceEmail } from '@/lib/is-admin'
import { xlsxResponse } from '@/lib/xlsx-workbook'
import { nzToday, resolveAccountantPackPeriod } from '@/app/portal/finance/_lib/periods'
import { buildAccountantPack } from '@/app/portal/finance/_lib/accountant-pack'
import { loadAccountantPackRaw } from '@/app/portal/finance/_lib/accountant-pack-data'
import { accountantPackWorkbook } from '@/app/portal/finance/_lib/accountant-pack-xlsx'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET(request: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!isFinanceEmail(user.email)) return NextResponse.json({ error: 'Admin only' }, { status: 403 })

  const sp = new URL(request.url).searchParams
  const today = nzToday()
  const { from, to } = resolveAccountantPackPeriod(today, sp.get('period'), sp.get('from'), sp.get('to'))

  try {
    const raw = await loadAccountantPackRaw(getServiceSupabase())
    const pack = buildAccountantPack(raw, from, to, today)
    const generatedAt = new Intl.DateTimeFormat('en-NZ', { timeZone: 'Pacific/Auckland', dateStyle: 'medium', timeStyle: 'short' }).format(new Date())
    const buf = await accountantPackWorkbook(pack, `${today} (${generatedAt})`)
    return xlsxResponse(buf, `Sano accountant pack ${from} to ${to}.xlsx`)
  } catch (e) {
    console.error('[accountant-pack]', e)
    return NextResponse.json({ error: 'Could not build the accountant pack. Please try again.' }, { status: 500 })
  }
}
