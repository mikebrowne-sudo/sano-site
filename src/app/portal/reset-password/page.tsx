// Phase 5.5.1 — Reset password page.
//
// Single landing target for both the invite path (?invite=1) and the
// forgot-password recovery path. Supabase puts the recovery token in
// the URL hash — the form is a client component because it needs
// `window.location.hash` to establish the session.

import { Suspense } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { ResetPasswordForm } from './_components/ResetPasswordForm'

export const metadata = {
  title: 'Set your password | Sano Portal',
  robots: 'noindex',
}

export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-sage-50 px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-10">
          <Image src="/brand/sano-logo.png" alt="Sano" width={120} height={40} className="mx-auto mb-4" />
        </div>
        <div className="bg-white rounded-2xl shadow-sm border border-sage-100 p-8">
          <Suspense fallback={<div className="h-40 animate-pulse bg-sage-50 rounded-xl" />}>
            <ResetPasswordForm />
          </Suspense>
          <p className="text-center text-xs text-sage-500 mt-6">
            <Link href="/portal/login" className="hover:text-sage-700 underline-offset-2 hover:underline">Back to sign in</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
