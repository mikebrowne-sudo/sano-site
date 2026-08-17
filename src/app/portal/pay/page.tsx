import { createClient } from '@/lib/supabase-server'
import { notFound } from 'next/navigation'
import { isFinanceUser } from '@/lib/is-admin'
import { HubGrid } from '../_components/HubGrid'
import { CalendarClock, ClipboardCheck, Banknote, FileInput, FolderOpen, Layers, Car } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function PayHubPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!isFinanceUser(user)) notFound()

  return (
    <HubGrid
      title="Pay"
      intro="Everything for paying people, in the order you do it — run a fortnightly pay cycle, then the records behind it."
      sections={[
        {
          heading: 'Run a pay cycle',
          cards: [
            { href: '/portal/contractor-invoices/pay-run', title: 'Pay run', desc: 'Bundle a fortnight’s authorised jobs into remittances.', icon: CalendarClock },
            { href: '/portal/contractor-invoices/pending-approvals', title: 'Pending approvals', desc: 'Completed jobs awaiting pay authorisation.', icon: ClipboardCheck },
            { href: '/portal/payroll', title: 'Employee pay', desc: 'Salaried staff — Carol and future employees.', icon: Banknote },
          ],
        },
        {
          heading: 'Records',
          cards: [
            { href: '/portal/contractor-invoices', title: 'Contractor invoices', desc: 'Every contractor payable, filterable.', icon: FileInput },
            { href: '/portal/contractor-invoices/remittances', title: 'Remittances', desc: 'Saved pay runs — sent and paid.', icon: FolderOpen },
            { href: '/portal/mileage', title: 'Mileage logbook', desc: 'Reimbursable driving kilometres.', icon: Car },
            { href: '/portal/contractor-statements', title: 'Contractor statements (historical)', desc: 'Retired workflow — old records, read-only.', icon: Layers },
          ],
        },
      ]}
    />
  )
}
