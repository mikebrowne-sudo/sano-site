'use client'

import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase-browser'

/** Bare, centred card used by the MFA pages (same look as the login page). */
export function MfaShell({ title, children }: { title: string; children: React.ReactNode }) {
  const router = useRouter()

  async function signOut() {
    await createClient().auth.signOut()
    router.push('/portal/login')
    router.refresh()
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-sage-50 px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <Image src="/brand/sano-logo.png" alt="Sano" width={120} height={40} className="mx-auto mb-4" />
          <p className="text-sage-600 text-sm">{title}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-sage-100 p-8 space-y-5">{children}</div>
        <button type="button" onClick={signOut} className="block mx-auto mt-6 text-sm text-sage-500 hover:text-sage-700">
          Sign out
        </button>
      </div>
    </div>
  )
}

export function CodeInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <input
      inputMode="numeric"
      autoComplete="one-time-code"
      pattern="[0-9]*"
      maxLength={6}
      value={value}
      onChange={(e) => onChange(e.target.value.replace(/\D/g, '').slice(0, 6))}
      placeholder="123456"
      autoFocus
      className="w-full rounded-lg border border-sage-200 px-4 py-3 text-center text-2xl tracking-[0.4em] text-sage-800 placeholder:text-sage-200 focus:outline-none focus:ring-2 focus:ring-sage-500 focus:border-transparent"
    />
  )
}
