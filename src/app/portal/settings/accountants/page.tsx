import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase-server'
import { isAdminUser, ACCOUNTANT_EMAILS } from '@/lib/is-admin'
import { AccountantInvites } from './_components/InviteButtons'

export const dynamic = 'force-dynamic'

export default async function AccountantsPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!isAdminUser(user)) notFound()

  return (
    <div className="max-w-2xl">
      <Link href="/portal/settings" className="inline-flex items-center gap-1.5 text-sm text-sage-600 hover:text-sage-800 transition-colors mb-4"><ArrowLeft size={14} /> Settings</Link>
      <h1 className="text-3xl tracking-tight font-bold text-sage-800 mb-2">Accountant access</h1>
      <p className="text-sm text-sage-500 mb-6 max-w-xl">
        These logins have <strong>read-only</strong> access to the finance area only — invoices, expenses, P&amp;L, bank
        reconciliation, contractor invoices, payroll and the CSV exports. They can’t see jobs, quotes or clients, and can’t
        change anything. Send each one an invite to set their password; they can reset it anytime via “Forgot your password?”.
      </p>

      <AccountantInvites emails={[...ACCOUNTANT_EMAILS]} />

      <p className="text-xs text-sage-400 mt-6">
        To add or remove an accountant, update the list in code (<code>ACCOUNTANT_EMAILS</code>) and the matching database
        policy. Re-sending an invite is safe — it just issues a fresh set-password link.
      </p>
    </div>
  )
}
