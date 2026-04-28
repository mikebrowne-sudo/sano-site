// Phase 5.5.8 — Admin portal-access settings page.
//
// Single-page form: feature flags + email templates. Admin-only —
// non-admin staff get a clear message instead of the form. Persists
// through workforce_settings.

import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { createClient } from '@/lib/supabase-server'
import { loadWorkforceSettings } from '@/lib/workforce-settings'
import { SettingsForm } from './_components/SettingsForm'

const ADMIN_EMAIL = 'michael@sano.nz'

export default async function PortalAccessSettingsPage() {
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
        <h1 className="text-2xl font-bold text-sage-800 mb-2">Portal access</h1>
        <p className="text-sm text-sage-600 bg-sage-50 border border-sage-100 rounded-xl px-4 py-3">
          Settings are admin-only. Contact your Sano admin if you need a flag changed.
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
        <h1 className="text-2xl font-bold text-sage-800">Portal access</h1>
        <p className="text-sm text-sage-500 mt-0.5">Feature flags for the contractor + customer portals, and the auth email templates.</p>
      </header>

      <SettingsForm
        initial={{
          enable_contractor_portal: settings.enable_contractor_portal,
          enable_customer_portal:   settings.enable_customer_portal,
          enable_pwa_prompt:        settings.enable_pwa_prompt,
          enable_cleanup_mode:      settings.enable_cleanup_mode,
          invite_email_subject:       settings.invite_email_subject,
          invite_email_body_template: settings.invite_email_body_template,
          reset_email_subject:        settings.reset_email_subject,
          reset_email_body_template:  settings.reset_email_body_template,
        }}
      />
    </div>
  )
}
