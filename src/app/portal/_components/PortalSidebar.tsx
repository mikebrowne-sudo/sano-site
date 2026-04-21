'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, FileText, Receipt, Briefcase, RefreshCw, Users, HardHat, BookOpen, DollarSign, FileInput, Wallet, Bell, Settings, Calculator } from 'lucide-react'
import clsx from 'clsx'

const links = [
  { href: '/portal', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/portal/quotes', label: 'Quotes', icon: FileText },
  { href: '/portal/commercial-calculator', label: 'Commercial calc', icon: Calculator },
  { href: '/portal/invoices', label: 'Invoices', icon: Receipt },
  { href: '/portal/jobs', label: 'Jobs', icon: Briefcase },
  { href: '/portal/recurring-jobs', label: 'Recurring', icon: RefreshCw },
  { href: '/portal/clients', label: 'Clients', icon: Users },
  { href: '/portal/contractors', label: 'Contractors', icon: HardHat },
  { href: '/portal/training', label: 'Training', icon: BookOpen },
  { href: '/portal/contractor-invoices', label: 'Contractor Inv.', icon: FileInput },
  { href: '/portal/payroll', label: 'Payroll', icon: Wallet },
  { href: '/portal/finance', label: 'Finance', icon: DollarSign },
  { href: '/portal/alerts', label: 'Alerts', icon: Bell },
  { href: '/portal/settings', label: 'Settings', icon: Settings },
]

export function PortalSidebar() {
  const pathname = usePathname()

  function isActive(href: string) {
    if (href === '/portal') return pathname === '/portal'
    return pathname.startsWith(href)
  }

  return (
    <aside className="hidden md:flex md:w-56 flex-col bg-sage-800 text-white min-h-screen">
      <div className="px-5 py-6 border-b border-sage-700">
        <span className="font-display font-bold text-lg tracking-tight">Sano</span>
        <span className="text-sage-200 text-xs ml-2">Portal</span>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1">
        {links.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
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
    </aside>
  )
}
