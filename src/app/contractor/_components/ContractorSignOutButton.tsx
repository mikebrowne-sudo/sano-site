'use client'

// Phase 5.5.4 — Sign-out button for the contractor profile page.

import { useRouter } from 'next/navigation'
import { LogOut } from 'lucide-react'
import { createClient } from '@/lib/supabase-browser'

export function ContractorSignOutButton() {
  const router = useRouter()

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/contractor/login')
    router.refresh()
  }

  return (
    <button
      type="button"
      onClick={handleLogout}
      className="w-full flex items-center justify-center gap-2 bg-white border border-sage-200 text-sage-700 font-semibold px-4 py-3.5 rounded-2xl text-sm hover:bg-sage-50 active:bg-sage-100 transition-colors min-h-[48px]"
    >
      <LogOut size={16} />
      Sign out
    </button>
  )
}
