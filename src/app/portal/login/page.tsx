'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase-browser'
import Image from 'next/image'

export default function PortalLoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    router.push('/portal')
    router.refresh()
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-sage-50 px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-10">
          <Image
            src="/brand/sano-logo.png"
            alt="Sano"
            width={120}
            height={40}
            className="mx-auto mb-4"
          />
          <p className="text-sage-600 text-sm">Staff Portal</p>
        </div>

        <form onSubmit={handleLogin} className="bg-white rounded-2xl shadow-sm border border-sage-100 p-8 space-y-5">
          <div>
            <label htmlFor="email" className="block text-sm font-semibold text-sage-800 mb-1.5">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              autoComplete="email"
              className="w-full rounded-lg border border-sage-200 px-4 py-3 text-sage-800 placeholder:text-sage-200 focus:outline-none focus:ring-2 focus:ring-sage-500 focus:border-transparent"
              placeholder="you@sano.co.nz"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-semibold text-sage-800 mb-1.5">
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              autoComplete="current-password"
              className="w-full rounded-lg border border-sage-200 px-4 py-3 text-sage-800 placeholder:text-sage-200 focus:outline-none focus:ring-2 focus:ring-sage-500 focus:border-transparent"
              placeholder="••••••••"
            />
          </div>

          {error && (
            <p className="text-red-600 text-sm bg-red-50 rounded-lg px-3 py-2">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-sage-500 text-white font-semibold py-3 rounded-lg hover:bg-sage-700 transition-colors disabled:opacity-50"
          >
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
      </div>
    </div>
  )
}
