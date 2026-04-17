'use client'

import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase-browser'
import { LogOut, Menu } from 'lucide-react'
import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, FileText, Receipt, Briefcase, RefreshCw, Users, HardHat, BookOpen, DollarSign, Bell, Settings } from 'lucide-react'
import clsx from 'clsx'

const links = [
  { href: '/portal', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/portal/quotes', label: 'Quotes', icon: FileText },
  { href: '/portal/invoices', label: 'Invoices', icon: Receipt },
  { href: '/portal/jobs', label: 'Jobs', icon: Briefcase },
  { href: '/portal/recurring-jobs', label: 'Recurring', icon: RefreshCw },
  { href: '/portal/clients', label: 'Clients', icon: Users },
  { href: '/portal/contractors', label: 'Contractors', icon: HardHat },
  { href: '/portal/training', label: 'Training', icon: BookOpen },
  { href: '/portal/finance', label: 'Finance', icon: DollarSign },
  { href: '/portal/alerts', label: 'Alerts', icon: Bell },
  { href: '/portal/settings', label: 'Settings', icon: Settings },
]

export function PortalTopbar({ email }: { email?: string }) {
  const router = useRouter()
  const pathname = usePathname()
  const [mobileOpen, setMobileOpen] = useState(false)

  function isActive(href: string) {
    if (href === '/portal') return pathname === '/portal'
    return pathname.startsWith(href)
  }

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/portal/login')
    router.refresh()
  }

  return (
    <>
      <header className="bg-white border-b border-sage-100 px-4 md:px-6 py-3 flex items-center justify-between">
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
        <nav className="md:hidden bg-sage-800 px-3 py-3 space-y-1">
          {links.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              onClick={() => setMobileOpen(false)}
              className={clsx(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                isActive(href)
                  ? 'bg-sage-700 text-white'
                  : 'text-sage-200 hover:bg-sage-700/50 hover:text-white',
              )}
            >
              <Icon size={18} />
              {label}
            </Link>
          ))}
        </nav>
      )}
    </>
  )
}
