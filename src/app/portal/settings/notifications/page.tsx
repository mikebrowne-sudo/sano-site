// Phase H — notifications settings page (admin-only).
//
// Loads the singleton settings row + every template row + the
// Twilio config status (server-side env check) and hands them to
// the client form.

import { createClient } from '@/lib/supabase-server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import type { Metadata } from 'next'
import { isAdminEmail } from '@/lib/is-admin'
import { loadNotificationSettings } from '@/lib/notifications/settings'
import { getTwilioConfigStatus } from '@/lib/notifications/twilio'
import { ALL_NOTIFICATION_TYPES, TEMPLATE_PLACEHOLDERS } from '@/lib/notifications/types'
import { NotificationSettingsForm } from './_components/NotificationSettingsForm'

export const metadata: Metadata = {
  title: 'Notification settings — Sano Portal',
  robots: 'noindex, nofollow',
}

export const dynamic = 'force-dynamic'

export default async function NotificationSettingsPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || !isAdminEmail(user.email)) notFound()

  const [settings, twilioStatus, { data: templates }] = await Promise.all([
    loadNotificationSettings(supabase),
    Promise.resolve(getTwilioConfigStatus()),
    supabase
      .from('notification_templates')
      .select('type, channel, audience, body, enabled')
      .order('audience'),
  ])

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
        <h1 className="text-3xl font-bold text-sage-800 tracking-tight">Notifications</h1>
        <p className="text-sm text-sage-600 mt-1.5 max-w-2xl">
          SMS via Twilio. Toggles below decide which audiences and
          notification types are eligible to send. No notification
          fires unless every gate (provider, channel, type, manual
          / automated source, template, recipient) passes — skipped
          attempts are still recorded in the notification log.
        </p>
      </div>

      <NotificationSettingsForm
        initialSettings={settings}
        twilioStatus={twilioStatus}
        templates={(templates ?? []) as Array<{
          type: string
          channel: 'sms' | 'email'
          audience: 'contractor' | 'customer' | 'staff'
          body: string
          enabled: boolean
        }>}
        notificationTypes={[...ALL_NOTIFICATION_TYPES]}
        placeholders={[...TEMPLATE_PLACEHOLDERS]}
      />
    </div>
  )
}
