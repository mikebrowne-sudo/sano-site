// Phase E.1 — new contractor pay run form (admin-only).
//
// Server component renders a tiny form (period_start, period_end,
// optional notes). Submitted via the submitNewContractorPayRun
// server action which reads the FormData, calls
// createContractorPayRun, then redirects to the detail page on
// success or returns the error so the form can render it.

import { createClient } from '@/lib/supabase-server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { isAdminEmail } from '@/lib/is-admin'
import { NewPayRunForm } from './_components/NewPayRunForm'

export const dynamic = 'force-dynamic'

export default async function NewContractorPayRunPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || !isAdminEmail(user.email)) notFound()

  // Default period: previous Mon-Sun. Cheap convenience so the
  // operator doesn't have to pick dates from scratch every fortnight.
  const today = new Date()
  const day = today.getUTCDay() // 0 (Sun) – 6 (Sat)
  const daysSinceMon = (day + 6) % 7 // 0 if Mon, 6 if Sun
  const lastMon = new Date(today)
  lastMon.setUTCDate(today.getUTCDate() - daysSinceMon - 7)
  const lastSun = new Date(lastMon)
  lastSun.setUTCDate(lastMon.getUTCDate() + 6)

  return (
    <div>
      <Link
        href="/portal/payroll/contractor-runs"
        className="inline-flex items-center gap-1.5 text-sm text-sage-600 hover:text-sage-800 transition-colors mb-4"
      >
        <ArrowLeft size={14} />
        Back to contractor pay runs
      </Link>

      <div className="mb-8">
        <h1 className="text-3xl font-bold text-sage-800 tracking-tight">New contractor pay run</h1>
        <p className="text-sm text-sage-600 mt-1.5 max-w-2xl">
          Bundles approved contractor hours into a pay run. Only rows
          approved within the selected period are included; rows
          already in another pay run are skipped.
        </p>
      </div>

      <NewPayRunForm
        defaultStart={lastMon.toISOString().slice(0, 10)}
        defaultEnd={lastSun.toISOString().slice(0, 10)}
      />
    </div>
  )
}
