import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase-server'
import { PortalSidebar } from './_components/PortalSidebar'
import { PortalTopbar } from './_components/PortalTopbar'

export const metadata: Metadata = {
  title: 'Sano Portal',
  robots: 'noindex, nofollow',
}

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Login page renders without the shell
  if (!user) {
    return <>{children}</>
  }

  return (
    <div className="flex min-h-screen bg-sage-50">
      <PortalSidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <PortalTopbar email={user.email} />
        <main className="flex-1 p-4 md:p-8">{children}</main>
      </div>
    </div>
  )
}
