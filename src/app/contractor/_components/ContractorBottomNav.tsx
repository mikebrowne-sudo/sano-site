'use client'

// Phase 5.5.4 — Mobile-only bottom nav for the contractor portal.
// Hidden on md+ screens (the topbar carries nav for desktop).

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Briefcase, GraduationCap, User } from 'lucide-react'
import clsx from 'clsx'

const ITEMS = [
  { href: '/contractor/jobs',     label: 'Jobs',     Icon: Briefcase },
  { href: '/contractor/training', label: 'Training', Icon: GraduationCap },
  { href: '/contractor/profile',  label: 'Profile',  Icon: User },
] as const

export function ContractorBottomNav() {
  const pathname = usePathname() ?? ''

  return (
    <nav
      aria-label="Contractor navigation"
      className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-white border-t border-sage-100 pb-[env(safe-area-inset-bottom)]"
    >
      <ul className="flex">
        {ITEMS.map(({ href, label, Icon }) => {
          const active = pathname === href || pathname.startsWith(href + '/')
          return (
            <li key={href} className="flex-1">
              <Link
                href={href}
                className={clsx(
                  'flex flex-col items-center justify-center gap-1 py-2 min-h-[56px] text-[11px] font-medium transition-colors active:bg-sage-50',
                  active ? 'text-sage-800' : 'text-sage-500',
                )}
                aria-current={active ? 'page' : undefined}
              >
                <Icon size={22} strokeWidth={active ? 2.4 : 1.8} />
                <span>{label}</span>
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
