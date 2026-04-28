// Phase 5.5.14 — dedicated Cleanup-mode settings page.
//
// Surfaced from /portal/settings via its own card. Admin-only — the
// page itself rejects non-admins with a clear message, and the server
// action enforces the same check.

import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { createClient } from '@/lib/supabase-server'
import { loadWorkforceSettings } from '@/lib/workforce-settings'
import { CleanupModeToggle } from './_components/CleanupModeToggle'

const ADMIN_EMAIL = 'michael@sano.nz'

export default async function CleanupModePage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const isAdmin = user?.email === ADMIN_EMAIL

  if (!isAdmin) {
    return (
      <div className="max-w-2xl">
        <Link href="/portal/settings" className="inline-flex items-center gap-1.5 text-sm text-sage-600 hover:text-sage-800 transition-colors mb-4">
          <ArrowLeft size={14} />
          Back to settings
        </Link>
        <h1 className="text-2xl font-bold text-sage-800 mb-2">Cleanup mode</h1>
        <p className="text-sm text-sage-600 bg-sage-50 border border-sage-100 rounded-xl px-4 py-3">
          This setting is admin-only. Contact your Sano admin if you need cleanup mode toggled.
        </p>
      </div>
    )
  }

  const settings = await loadWorkforceSettings(supabase)

  return (
    <div className="max-w-2xl">
      <Link href="/portal/settings" className="inline-flex items-center gap-1.5 text-sm text-sage-600 hover:text-sage-800 transition-colors mb-4">
        <ArrowLeft size={14} />
        Back to settings
      </Link>
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-sage-800">Cleanup mode</h1>
        <p className="text-sm text-sage-500 mt-0.5">
          Operational gate for record cleanup. Admin-only.
        </p>
      </header>

      <CleanupModeToggle initial={settings.enable_cleanup_mode} />
    </div>
  )
}
