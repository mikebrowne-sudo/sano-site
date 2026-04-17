import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase-server'
import { ContractorTopbar } from './_components/ContractorTopbar'

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

  return (
    <div className="min-h-screen bg-sage-50">
      <ContractorTopbar name={contractor.full_name} />
      <main className="max-w-3xl mx-auto px-4 py-6">{children}</main>
    </div>
  )
}
