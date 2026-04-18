'use client'

import { useState, useRef, useTransition } from 'react'
import { uploadDocument } from '../_actions'
import { Upload, CheckCircle, ChevronDown } from 'lucide-react'

const DOC_TYPES = [
  { value: 'contract', label: 'Contract' },
  { value: 'insurance', label: 'Insurance' },
  { value: 'right_to_work', label: 'Right to Work' },
  { value: 'health_and_safety', label: 'Health & Safety' },
  { value: 'onboarding', label: 'Onboarding' },
  { value: 'policy', label: 'Policy' },
  { value: 'id_verification', label: 'ID / Verification' },
  { value: 'other', label: 'Other' },
]

export function DocumentUpload({ contractorId }: { contractorId: string }) {
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const formRef = useRef<HTMLFormElement>(null)

  function handleSubmit(formData: FormData) {
    setError(null)
    setSuccess(false)
    formData.set('contractor_id', contractorId)

    startTransition(async () => {
      const result = await uploadDocument(formData)
      if (result?.error) {
        setError(result.error)
      } else {
        setSuccess(true)
        formRef.current?.reset()
        setTimeout(() => { setSuccess(false); setOpen(false) }, 2000)
      }
    })
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 bg-sage-500 text-white font-medium px-4 py-2.5 rounded-lg text-sm hover:bg-sage-700 transition-colors"
      >
        <Upload size={14} />
        Upload Document
      </button>
    )
  }

  if (success) {
    return (
      <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4 flex items-center gap-3">
        <CheckCircle size={16} className="text-emerald-600" />
        <span className="text-sm text-emerald-700 font-medium">Document uploaded</span>
      </div>
    )
  }

  return (
    <form ref={formRef} action={handleSubmit} className="bg-sage-50 border border-sage-200 rounded-xl p-5 space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <label className="block">
          <span className="block text-sm font-semibold text-sage-800 mb-1.5">Title *</span>
          <input name="title" required className="w-full rounded-lg border border-sage-200 px-4 py-3 text-sage-800 placeholder:text-sage-300 focus:outline-none focus:ring-2 focus:ring-sage-500 focus:border-transparent text-sm bg-white" placeholder="e.g. Employment contract" />
        </label>
        <label className="block">
          <span className="block text-sm font-semibold text-sage-800 mb-1.5">Type</span>
          <div className="relative">
            <select name="document_type" defaultValue="other" className="w-full appearance-none rounded-lg border border-sage-200 px-4 py-3 pr-10 text-sage-800 focus:outline-none focus:ring-2 focus:ring-sage-500 focus:border-transparent text-sm bg-white">
              {DOC_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
            <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-sage-400 pointer-events-none" />
          </div>
        </label>
      </div>

      <label className="block">
        <span className="block text-sm font-semibold text-sage-800 mb-1.5">File *</span>
        <input name="file" type="file" required className="w-full text-sm text-sage-700 file:mr-4 file:py-2.5 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-sage-200 file:text-sage-700 hover:file:bg-sage-300 file:cursor-pointer" />
      </label>

      <label className="block">
        <span className="block text-sm font-semibold text-sage-800 mb-1.5">Notes</span>
        <input name="notes" className="w-full rounded-lg border border-sage-200 px-4 py-3 text-sage-800 placeholder:text-sage-300 focus:outline-none focus:ring-2 focus:ring-sage-500 focus:border-transparent text-sm bg-white" placeholder="Optional" />
      </label>

      {error && <p className="text-red-600 text-sm">{error}</p>}

      <div className="flex items-center gap-3">
        <button type="submit" disabled={isPending} className="bg-sage-500 text-white font-semibold px-5 py-2.5 rounded-lg text-sm hover:bg-sage-700 transition-colors disabled:opacity-50">
          {isPending ? 'Uploading…' : 'Upload'}
        </button>
        <button type="button" onClick={() => setOpen(false)} className="text-sm text-sage-600 hover:text-sage-800 transition-colors">Cancel</button>
      </div>
    </form>
  )
}
