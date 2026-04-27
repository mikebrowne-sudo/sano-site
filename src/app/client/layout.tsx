// Phase 5.5.5 — Client portal scaffold layout.
//
// Auth + role gating happens upstream in src/middleware.ts. This
// layout assumes any request reaching it is either authenticated
// with a matching clients.auth_user_id, or the unauthenticated
// /client/login route. No client data is rendered yet.

import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Sano — Client Portal',
  robots: 'noindex, nofollow',
}

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-sage-50">
      <main className="max-w-2xl mx-auto px-4 py-10">{children}</main>
    </div>
  )
}
