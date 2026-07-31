import { createClient } from '@/lib/supabase-server'
import { notFound } from 'next/navigation'
import { isFinanceUser } from '@/lib/is-admin'
import { HubGrid } from '../_components/HubGrid'
import { Scale, BarChart3, Landmark, ShieldAlert, Wallet2 } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function ReportsHubPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!isFinanceUser(user)) notFound()

  return (
    <HubGrid
      title="Reports"
      intro="The financial reports, in one place — profit, margins, reconciliation and tax review."
      sections={[
        {
          cards: [
            { href: '/portal/finance/profit-loss', title: 'P&L statement', desc: 'Profit & loss for any period.', icon: Scale },
            { href: '/portal/finance/job-margins', title: 'Job margins', desc: 'Profit per job, plus jobs flagged to action.', icon: BarChart3 },
            { href: '/portal/finance/reconcile', title: 'Bank reconciliation', desc: 'Match bank statements to the ledger.', icon: Landmark },
            { href: '/portal/finance/contractor-tax-remediation', title: 'Contractor tax remediation', desc: 'Historical tax gaps to review (read-only).', icon: ShieldAlert },
            { href: '/portal/expenses', title: 'Expenses', desc: 'Recorded business expenses.', icon: Wallet2 },
          ],
        },
      ]}
    />
  )
}
