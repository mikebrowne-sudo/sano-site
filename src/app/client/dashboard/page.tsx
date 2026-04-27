// Phase 5.5.5 — Customer portal placeholder page (scaffold only).
//
// Middleware has already established that the visitor is either an
// authenticated client user, or a customer-facing visitor allowed by
// the gate. We deliberately render NO client data here: this surface
// exists so we can wire role detection + the feature flag end-to-end
// without exposing quotes / invoices / jobs / documents yet.

import Image from 'next/image'
import { createClient } from '@/lib/supabase-server'
import { loadWorkforceSettings } from '@/lib/workforce-settings'

export default async function ClientDashboardPage() {
  const supabase = createClient()
  const settings = await loadWorkforceSettings(supabase)
  const enabled = settings.enable_customer_portal

  return (
    <div className="bg-white rounded-2xl border border-sage-100 shadow-sm p-8 text-center">
      <Image
        src="/brand/sano-mark.svg"
        alt="Sano"
        width={56}
        height={56}
        className="mx-auto mb-4"
        unoptimized
      />
      <h1 className="text-xl font-bold text-sage-800 mb-2">
        {enabled ? 'Your Sano client portal is coming soon.' : 'Client portal access is not available yet.'}
      </h1>
      <p className="text-sage-600 text-sm leading-relaxed">
        {enabled
          ? 'We’re building the portal where you’ll see your quotes, invoices, and bookings. We’ll email you when it’s ready.'
          : 'The Sano client portal isn’t open yet. If you need anything in the meantime, please contact us directly.'}
      </p>
    </div>
  )
}
