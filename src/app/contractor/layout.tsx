import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase-server'
import { ContractorTopbar } from './_components/ContractorTopbar'
import { ContractorBottomNav } from './_components/ContractorBottomNav'
import { InstallPrompt } from './_components/InstallPrompt'
import { loadWorkforceSettings } from '@/lib/workforce-settings'

export const metadata: Metadata = {
  title: 'Sano — Contractor Portal',
  robots: 'noindex, nofollow',
}

export default async function ContractorLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Login page renders without shell
  if (!user) {
    return <>{children}</>
  }

  // Look up contractor record
  const { data: contractor } = await supabase
    .from('contractors')
    .select('id, full_name')
    .eq('auth_user_id', user.id)
    .maybeSingle()

  if (!contractor) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-sage-50 px-4">
        <div className="text-center max-w-sm">
          <h1 className="text-xl font-bold text-sage-800 mb-2">Access Denied</h1>
          <p className="text-sage-600 text-sm mb-4">Your account is not linked to a contractor record. Please contact Sano to get set up.</p>
        </div>
      </div>
    )
  }

  const settings = await loadWorkforceSettings(supabase)

  return (
    <div className="min-h-screen bg-sage-50">
      <ContractorTopbar name={contractor.full_name} />
      {/* pb-24 reserves space for the mobile bottom nav so content
          doesn't sit beneath it. md+ falls back to py-6 since the nav
          is hidden. */}
      <main className="max-w-3xl mx-auto px-4 pt-6 pb-24 md:pb-6">{children}</main>
      {settings.contractor_mobile_bottom_nav_enabled && <ContractorBottomNav />}
      {settings.enable_pwa_prompt && <InstallPrompt />}
    </div>
  )
}
