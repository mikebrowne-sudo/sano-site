// Bare print view for the payslip PDF (Puppeteer navigates here with the staff
// session cookies). ?mode=preview → unstored draft for an approved run;
// otherwise the official snapshot (created once the run is paid). Auth: admin, or
// the employee who owns the payslip.

import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase-server'
import { isAdminUser } from '@/lib/is-admin'
import { PayslipDocument } from '@/components/PayslipDocument'
import { buildPreviewSnapshot, ensureOfficialPayslip } from '@/lib/payroll/payslip-service'
import { getServiceSupabase } from '@/lib/supabase-service'

export const dynamic = 'force-dynamic'

async function canAccess(supabase: ReturnType<typeof createClient>, userId: string, isAdmin: boolean, lineId: string): Promise<boolean> {
  if (isAdmin) return true
  const { data: line } = await supabase.from('pay_run_lines').select('contractor_id').eq('id', lineId).maybeSingle()
  if (!line) return false
  const { data: c } = await supabase.from('contractors').select('auth_user_id').eq('id', line.contractor_id as string).maybeSingle()
  return (c?.auth_user_id as string | null) === userId
}

export default async function PayslipPrintPage({ params, searchParams }: { params: { lineId: string }; searchParams?: { mode?: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) notFound()
  const admin = isAdminUser(user)
  if (!(await canAccess(supabase, user.id, admin, params.lineId))) notFound()

  const preview = searchParams?.mode === 'preview'
  // Reads use the service client (RLS-independent) — access already authorised above.
  const svc = getServiceSupabase()

  if (preview) {
    const snap = await buildPreviewSnapshot(svc, params.lineId)
    if (!snap) notFound()
    return <PayslipDocument snapshot={snap} preview />
  }

  const official = await ensureOfficialPayslip(svc, params.lineId)
  if (!official) notFound() // not paid yet → no official payslip
  return <PayslipDocument snapshot={official.snapshot} />
}
