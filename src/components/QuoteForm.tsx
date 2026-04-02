'use client'

import { useState } from 'react'
import { useSearchParams } from 'next/navigation'
import type { QuoteFormData, QuoteFormErrors } from '@/types'
import { SERVICES } from '@/lib/services'

function validate(data: QuoteFormData): QuoteFormErrors {
  const errors: QuoteFormErrors = {}
  if (!data.name.trim()) errors.name = 'Name is required'
  if (!data.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
    errors.email = 'A valid email address is required'
  }
  if (!data.service) errors.service = 'Please select a service'
  if (!data.postcode.trim()) errors.postcode = 'Postcode is required'
  return errors
}

export function QuoteForm() {
  const searchParams = useSearchParams()
  const [form, setForm] = useState<QuoteFormData>({
    name: '',
    email: '',
    phone: '',
    service: searchParams.get('service') || '',
    postcode: searchParams.get('postcode') || '',
    preferredDate: '',
    message: '',
  })
  const [errors, setErrors] = useState<QuoteFormErrors>({})
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [errorMessage, setErrorMessage] = useState('')

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) {
    const { name, value } = e.target
    setForm((prev) => ({ ...prev, [name]: value }))
    if (errors[name as keyof QuoteFormErrors]) {
      setErrors((prev) => ({ ...prev, [name]: undefined }))
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const validationErrors = validate(form)
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors)
      return
    }

    setStatus('loading')
    try {
      const res = await fetch('/api/submit-quote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Submission failed')
      }
      setStatus('success')
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Something went wrong. Please try again.')
      setStatus('error')
    }
  }

  if (status === 'success') {
    return (
      <div className="bg-sage-50 border border-sage-100 rounded-2xl p-8 text-center">
        <p className="text-4xl mb-4" aria-hidden="true">✓</p>
        <h3 className="text-sage-800 mb-2">Quote request received!</h3>
        <p className="text-gray-600 text-sm">
          We&apos;ll be in touch within a few hours. Check your inbox for a confirmation email.
        </p>
      </div>
    )
  }

  const inputClass = (field: keyof QuoteFormErrors) =>
    `w-full rounded-xl border px-4 py-3 text-sm bg-sage-50 text-gray-800 focus:outline-none focus:ring-2 focus:ring-sage-300 ${
      errors[field] ? 'border-red-300' : 'border-sage-100'
    }`

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-5">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1.5">Name <span aria-hidden="true" className="text-red-400">*</span></label>
          <input id="name" name="name" type="text" autoComplete="name" value={form.name} onChange={handleChange} className={inputClass('name')} />
          {errors.name && <p className="mt-1 text-xs text-red-500" role="alert">{errors.name}</p>}
        </div>
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1.5">Email <span aria-hidden="true" className="text-red-400">*</span></label>
          <input id="email" name="email" type="email" autoComplete="email" value={form.email} onChange={handleChange} className={inputClass('email')} />
          {errors.email && <p className="mt-1 text-xs text-red-500" role="alert">{errors.email}</p>}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <div>
          <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1.5">Phone</label>
          <input id="phone" name="phone" type="tel" autoComplete="tel" value={form.phone} onChange={handleChange} className="w-full rounded-xl border border-sage-100 px-4 py-3 text-sm bg-sage-50 text-gray-800 focus:outline-none focus:ring-2 focus:ring-sage-300" />
        </div>
        <div>
          <label htmlFor="postcode" className="block text-sm font-medium text-gray-700 mb-1.5">Postcode <span aria-hidden="true" className="text-red-400">*</span></label>
          <input id="postcode" name="postcode" type="text" value={form.postcode} onChange={handleChange} className={inputClass('postcode')} />
          {errors.postcode && <p className="mt-1 text-xs text-red-500" role="alert">{errors.postcode}</p>}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <div>
          <label htmlFor="service" className="block text-sm font-medium text-gray-700 mb-1.5">Service <span aria-hidden="true" className="text-red-400">*</span></label>
          <select id="service" name="service" value={form.service} onChange={handleChange} className={inputClass('service')}>
            <option value="">Select a service...</option>
            {SERVICES.map((s) => (
              <option key={s.slug} value={s.slug}>{s.name}</option>
            ))}
          </select>
          {errors.service && <p className="mt-1 text-xs text-red-500" role="alert">{errors.service}</p>}
        </div>
        <div>
          <label htmlFor="preferredDate" className="block text-sm font-medium text-gray-700 mb-1.5">Preferred date <span className="text-gray-400 font-normal">(optional)</span></label>
          <input id="preferredDate" name="preferredDate" type="date" value={form.preferredDate} onChange={handleChange} className="w-full rounded-xl border border-sage-100 px-4 py-3 text-sm bg-sage-50 text-gray-800 focus:outline-none focus:ring-2 focus:ring-sage-300" />
        </div>
      </div>

      <div>
        <label htmlFor="message" className="block text-sm font-medium text-gray-700 mb-1.5">Message <span className="text-gray-400 font-normal">(optional)</span></label>
        <textarea id="message" name="message" rows={4} value={form.message} onChange={handleChange} className="w-full rounded-xl border border-sage-100 px-4 py-3 text-sm bg-sage-50 text-gray-800 focus:outline-none focus:ring-2 focus:ring-sage-300 resize-none" />
      </div>

      {status === 'error' && (
        <p className="text-sm text-red-500 bg-red-50 border border-red-200 rounded-xl px-4 py-3" role="alert">
          {errorMessage}
        </p>
      )}

      <button
        type="submit"
        disabled={status === 'loading'}
        className="w-full rounded-full bg-sage-800 px-6 py-4 font-medium text-white hover:bg-sage-500 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
      >
        {status === 'loading' ? 'Sending...' : 'Send Quote Request'}
      </button>
    </form>
  )
}
