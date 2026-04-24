// Phase D.2 — job settings page. Admin-only. Mirrors the
// proposal-settings page pattern: 404 for non-admin, loads current
// values with graceful defaults, renders a form that posts to
// saveJobSettings.

import { createClient } from '@/lib/supabase-server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import type { Metadata } from 'next'
import { loadJobSettings } from '@/lib/job-settings'
import { JobSettingsForm } from './_components/JobSettingsForm'

const ADMIN_EMAIL = 'michael@sano.nz'

export const metadata: Metadata = {
  title: 'Job settings — Sano Portal',
  robots: 'noindex, nofollow',
}

export const dynamic = 'force-dynamic'

export default async function JobSettingsPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || user.email !== ADMIN_EMAIL) notFound()

  const settings = await loadJobSettings(supabase)

  return (
    <div>
      <Link
        href="/portal/settings"
        className="inline-flex items-center gap-1.5 text-sm text-sage-600 hover:text-sage-800 transition-colors mb-4"
      >
        <ArrowLeft size={14} />
        Back to settings
      </Link>

      <div className="mb-8">
        <h1 className="text-3xl font-bold text-sage-800 tracking-tight">Job settings</h1>
        <p className="text-sm text-sage-600 mt-1.5 max-w-2xl">
          Operational defaults that apply when creating and closing jobs.
          These values do not change existing rows — they take effect on
          new jobs and new workflow transitions after saving.
        </p>
      </div>

      <JobSettingsForm initialSettings={settings} />
    </div>
  )
}
