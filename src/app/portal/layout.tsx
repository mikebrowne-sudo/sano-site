import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase-server'
import { isAdminUser, isAccountantUser } from '@/lib/is-admin'
import { PortalSidebar } from './_components/PortalSidebar'
import { PortalTopbar } from './_components/PortalTopbar'
import { PortalScrollRestoration } from './_components/PortalScrollRestoration'

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

  // Accountant (finance) logins are read-only and see only the finance area.
  const financeOnly = isAccountantUser(user) && !isAdminUser(user)

  return (
    <div className="flex min-h-screen bg-[#FAFBFC] print:block print:min-h-0 print:bg-white">
      <PortalScrollRestoration />
      <PortalSidebar financeOnly={financeOnly} />
      <div className="flex-1 flex flex-col min-w-0">
        <PortalTopbar email={user.email} financeOnly={financeOnly} />
        <main className="flex-1 p-4 md:p-10 print:p-0">
          <div className="max-w-7xl mx-auto w-full print:max-w-none">{children}</div>
        </main>
      </div>
    </div>
  )
}
