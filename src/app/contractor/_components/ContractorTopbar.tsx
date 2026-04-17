'use client'

import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase-browser'
import { LogOut } from 'lucide-react'
import Link from 'next/link'

export function ContractorTopbar({ name }: { name: string }) {
  const router = useRouter()

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/contractor/login')
    router.refresh()
  }

  return (
    <header className="bg-white border-b border-sage-100 px-4 py-3">
      <div className="max-w-3xl mx-auto flex items-center justify-between">
        <Link href="/contractor/jobs" className="flex items-center gap-2">
          <span className="font-display font-bold text-sage-800">Sano</span>
          <span className="text-sage-400 text-xs">Contractor</span>
        </Link>
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
