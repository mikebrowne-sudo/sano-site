'use client'

import { useRouter, usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase-browser'
import { LogOut } from 'lucide-react'
import Link from 'next/link'
import clsx from 'clsx'

export function ContractorTopbar({ name }: { name: string }) {
  const router = useRouter()
  const pathname = usePathname()

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/contractor/login')
    router.refresh()
  }

  const navItems = [
    { href: '/contractor/jobs', label: 'Jobs' },
    { href: '/contractor/training', label: 'Training' },
  ]

  return (
    <header className="bg-white border-b border-sage-100 px-4 py-3">
      <div className="max-w-3xl mx-auto flex items-center justify-between">
        <div className="flex items-center gap-5">
          <Link href="/contractor/jobs" className="flex items-center gap-2">
            <span className="font-display font-bold text-sage-800">Sano</span>
            <span className="text-sage-400 text-xs">Contractor</span>
          </Link>
          <nav className="flex items-center gap-1">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={clsx(
                  'px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
                  pathname.startsWith(item.href)
                    ? 'bg-sage-100 text-sage-800'
                    : 'text-sage-500 hover:text-sage-700',
                )}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm text-sage-600 hidden sm:inline">{name}</span>
          <button
            onClick={handleLogout}
            className="flex items-center gap-1.5 text-sm text-sage-500 hover:text-red-600 transition-colors"
          >
            <LogOut size={16} />
            <span className="hidden sm:inline">Sign out</span>
          </button>
        </div>
      </div>
    </header>
  )
}
