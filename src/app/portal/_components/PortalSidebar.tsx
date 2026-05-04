'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import clsx from 'clsx'
import { NAV_GROUPS, isNavActive } from './nav-config'

export function PortalSidebar() {
  const pathname = usePathname()

  return (
    <aside className="hidden md:flex md:w-60 flex-col bg-sage-800 text-white min-h-screen border-r border-black/5 print:hidden">
      <div className="px-5 py-6 border-b border-sage-700/60">
        <span className="font-display font-bold text-lg tracking-tight">Sano</span>
        <span className="text-sage-200 text-xs ml-2">Portal</span>
      </div>

      <nav className="flex-1 px-3 py-5 overflow-y-auto">
        {NAV_GROUPS.map((group, i) => (
          <div key={group.heading} className={clsx(i > 0 && 'mt-7')}>
            <div className="px-3 pt-1 pb-2.5 text-[10px] uppercase tracking-[0.16em] font-semibold text-sage-400/80">
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
                        title="Coming soon"
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
                      className={clsx(
                        'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors duration-150',
                        active
                          ? 'bg-sage-500 text-white shadow-sm ring-1 ring-sage-400/40'
                          : 'text-sage-200 hover:bg-sage-700/60 hover:text-white',
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
      </nav>
    </aside>
  )
}
