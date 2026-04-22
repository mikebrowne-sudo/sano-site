import { Settings, SlidersHorizontal } from 'lucide-react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase-server'

const ADMIN_EMAIL = 'michael@sano.nz'

export default async function SettingsPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const isAdmin = user?.email === ADMIN_EMAIL

  return (
    <div>
      <h1 className="text-2xl font-bold text-sage-800 mb-6">Settings</h1>

      {isAdmin && (
        <Link
          href="/portal/settings/pricing-engine"
          className="block bg-white rounded-xl border border-sage-100 p-5 mb-4 hover:border-sage-200 hover:shadow-sm transition-all"
        >
          <div className="flex items-start gap-3">
            <SlidersHorizontal size={20} className="text-sage-500 mt-0.5" />
            <div>
              <div className="text-sage-800 font-semibold text-sm">Pricing engine</div>
              <div className="text-sage-600 text-xs mt-1">
                Commercial margin tiers and multipliers. Admin-only.
              </div>
            </div>
          </div>
        </Link>
      )}

      <div className="bg-white rounded-xl border border-sage-100 p-10 text-center">
        <Settings size={32} className="text-sage-200 mx-auto mb-3" />
        <p className="text-sage-600 text-sm">More account and portal settings coming soon.</p>
      </div>
    </div>
  )
}
