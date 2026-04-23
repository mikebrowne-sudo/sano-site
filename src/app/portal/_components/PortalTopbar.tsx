'use client'

import { useRouter, usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase-browser'
import { LogOut, Menu } from 'lucide-react'
import { useState } from 'react'
import Link from 'next/link'
import clsx from 'clsx'
import { NAV_GROUPS, isNavActive } from './nav-config'

export function PortalTopbar({ email }: { email?: string }) {
  const router = useRouter()
  const pathname = usePathname()
  const [mobileOpen, setMobileOpen] = useState(false)

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/portal/login')
    router.refresh()
  }

  return (
    <>
      <header className="bg-white border-b border-sage-100 px-4 md:px-8 py-3 flex items-center justify-between">
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="md:hidden p-2 -ml-2 text-sage-600 hover:text-sage-800"
          aria-label="Toggle menu"
        >
          <Menu size={20} />
        </button>

        <div className="hidden md:block" />

        <div className="flex items-center gap-4">
          {email && (
            <span className="text-sm text-sage-600 hidden sm:inline">{email}</span>
          )}
          <button
            onClick={handleLogout}
            className="flex items-center gap-1.5 text-sm text-sage-600 hover:text-red-600 transition-colors"
          >
            <LogOut size={16} />
            <span className="hidden sm:inline">Sign out</span>
          </button>
        </div>
      </header>

      {/* Mobile nav drawer */}
      {mobileOpen && (
        <div className="md:hidden bg-sage-800 px-3 py-3 max-h-[70vh] overflow-y-auto">
          {NAV_GROUPS.map((group, i) => (
            <div key={group.heading} className={clsx(i > 0 && 'mt-4')}>
              <div className="px-3 pt-1 pb-2 text-[10px] uppercase tracking-[0.14em] font-semibold text-sage-400/80">
                {group.heading}
              </div>
              <ul className="space-y-0.5">
                {group.items.map(({ href, label, icon: Icon, placeholder }) => {
                  const active = isNavActive(pathname, { href, label, icon: Icon, placeholder })
                  if (placeholder) {
                    return (
                      <li key={label}>
                        <span
                          aria-disabled="true"
                          className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-sage-300/50 cursor-not-allowed select-none"
                        >
                          <Icon size={17} />
                          <span className="flex-1">{label}</span>
                          <span className="text-[9px] uppercase tracking-wider bg-sage-700/60 text-sage-300/80 px-1.5 py-0.5 rounded">
                            Soon
                          </span>
                        </span>
                      </li>
                    )
                  }
                  return (
                    <li key={href}>
                      <Link
                        href={href}
                        onClick={() => setMobileOpen(false)}
                        className={clsx(
                          'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                          active
                            ? 'bg-sage-500 text-white shadow-sm'
                            : 'text-sage-200 hover:bg-sage-700/50 hover:text-white',
                        )}
                      >
                        <Icon size={17} />
                        <span className="flex-1">{label}</span>
                      </Link>
                    </li>
                  )
                })}
              </ul>
            </div>
          ))}
        </div>
      )}
    </>
  )
}
