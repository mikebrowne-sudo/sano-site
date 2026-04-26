'use client'

// Phase 5.5.2 — Staff create/edit form.

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { createStaff, updateStaff } from '../_actions'

type Role = 'admin' | 'staff'

export interface StaffFormData {
  id?: string
  full_name?: string | null
  email?: string | null
  role?: string | null
}

export function StaffForm({ staff }: { staff?: StaffFormData }) {
  const router = useRouter()
  const isEdit = !!staff?.id
  const [fullName, setFullName] = useState(staff?.full_name ?? '')
  const [email, setEmail] = useState(staff?.email ?? '')
  const [role, setRole] = useState<Role>((staff?.role as Role | null) ?? 'staff')
  const [pending, startTransition] = useTransition()
  const [errorMessage, setErrorMessage] = useState('')

  function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setErrorMessage('')
    startTransition(async () => {
      const result = isEdit && staff?.id
        ? await updateStaff({ id: staff.id, full_name: fullName, email, role })
        : await createStaff({ full_name: fullName, email, role })
      if ('error' in result) {
        setErrorMessage(result.error)
        return
      }
      if (isEdit && staff?.id) {
        router.push(`/portal/staff/${staff.id}`)
      } else if ('id' in result) {
        router.push(`/portal/staff/${result.id}`)
      }
      router.refresh()
    })
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5 max-w-md">
      <div>
        <label htmlFor="full_name" className="block text-sm font-semibold text-sage-800 mb-1.5">Full name</label>
        <input
          id="full_name"
          type="text"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          required
          autoComplete="name"
          className="w-full rounded-lg border border-sage-200 px-4 py-2.5 text-sage-800 focus:outline-none focus:ring-2 focus:ring-sage-300 focus:border-sage-300"
          placeholder="Jane Cleaner"
        />
      </div>
      <div>
        <label htmlFor="email" className="block text-sm font-semibold text-sage-800 mb-1.5">Email</label>
        <input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          autoComplete="email"
          className="w-full rounded-lg border border-sage-200 px-4 py-2.5 text-sage-800 focus:outline-none focus:ring-2 focus:ring-sage-300 focus:border-sage-300"
          placeholder="jane@sano.nz"
        />
      </div>
      <div>
        <label className="block text-sm font-semibold text-sage-800 mb-1.5">Role</label>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setRole('staff')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${role === 'staff' ? 'bg-sage-500 text-white' : 'bg-white border border-sage-200 text-sage-700 hover:bg-sage-50'}`}
          >
            Staff
          </button>
          <button
            type="button"
            onClick={() => setRole('admin')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${role === 'admin' ? 'bg-sage-500 text-white' : 'bg-white border border-sage-200 text-sage-700 hover:bg-sage-50'}`}
          >
            Admin
          </button>
        </div>
        <p className="text-xs text-sage-500 mt-1.5">
          {role === 'admin' ? 'Full access — can manage staff, contractors, and settings.' : 'Standard staff access — same routes, no admin-only writes.'}
        </p>
      </div>
      {errorMessage && (
        <p className="text-red-600 text-sm bg-red-50 rounded-lg px-3 py-2">{errorMessage}</p>
      )}
      <div className="flex items-center gap-2 pt-2">
        <button
          type="submit"
          disabled={pending || !fullName.trim() || !email.trim()}
          className="bg-sage-500 text-white font-semibold px-5 py-2.5 rounded-lg text-sm hover:bg-sage-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {pending ? 'Saving…' : (isEdit ? 'Save changes' : 'Create staff record')}
        </button>
        <button
          type="button"
          onClick={() => router.push('/portal/staff')}
          disabled={pending}
          className="px-4 py-2.5 rounded-lg text-sm text-sage-700 hover:bg-gray-100 transition-colors disabled:opacity-50"
        >
          Cancel
        </button>
      </div>
    </form>
  )
}
