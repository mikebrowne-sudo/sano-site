// Phase 5.5.1 — Forgot password page.
//
// Server component shell — renders the brand frame; the form itself
// is a small client component. Generic success messaging regardless
// of whether the email exists.

import Image from 'next/image'
import Link from 'next/link'
import { ForgotPasswordForm } from './_components/ForgotPasswordForm'

export const metadata = {
  title: 'Forgot password | Sano Portal',
  robots: 'noindex',
}

export default function ForgotPasswordPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-sage-50 px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-10">
          <Image src="/brand/sano-logo.png" alt="Sano" width={120} height={40} className="mx-auto mb-4" />
          <p className="text-sage-600 text-sm">Forgot your password?</p>
        </div>
        <div className="bg-white rounded-2xl shadow-sm border border-sage-100 p-8">
          <ForgotPasswordForm />
          <p className="text-center text-xs text-sage-500 mt-6">
            <Link href="/portal/login" className="hover:text-sage-700 underline-offset-2 hover:underline">Back to sign in</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
