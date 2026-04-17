'use client'

import { useState, useTransition } from 'react'
import { createModule, updateModule } from '../_actions'
import { ChevronDown } from 'lucide-react'
import clsx from 'clsx'

const CATEGORIES = [
  { value: 'onboarding', label: 'Onboarding' },
  { value: 'cleaning_training', label: 'Cleaning Training' },
  { value: 'health_and_safety', label: 'Health & Safety' },
  { value: 'compliance', label: 'Compliance' },
  { value: 'policy', label: 'Policy' },
  { value: 'other', label: 'Other' },
]

interface ModuleData {
  id?: string
  title: string
  category: string
  description: string | null
  content: string | null
  status: string
  requires_acknowledgement: boolean
  requires_completion: boolean
  sort_order: number
}

export function ModuleForm({ module }: { module?: ModuleData }) {
  const isEdit = !!module?.id

  const [title, setTitle] = useState(module?.title ?? '')
  const [category, setCategory] = useState(module?.category ?? 'other')
  const [description, setDescription] = useState(module?.description ?? '')
  const [content, setContent] = useState(module?.content ?? '')
  const [status, setStatus] = useState(module?.status ?? 'active')
  const [requiresAck, setRequiresAck] = useState(module?.requires_acknowledgement ?? false)
  const [requiresCompletion, setRequiresCompletion] = useState(module?.requires_completion ?? true)
  const [sortOrder, setSortOrder] = useState(String(module?.sort_order ?? 0))

  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (!title.trim()) { setError('Title is required.'); return }

    const input = {
      title: title.trim(),
      category,
      description: description.trim() || undefined,
      content: content.trim() || undefined,
      status,
      requires_acknowledgement: requiresAck,
      requires_completion: requiresCompletion,
      sort_order: parseInt(sortOrder) || 0,
    }

    startTransition(async () => {
      const result = isEdit ? await updateModule(module!.id!, input) : await createModule(input)
      if (result?.error) setError(result.error)
    })
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-2xl space-y-10">
      <Section title="Details">
        <Field label="Title" required value={title} onChange={setTitle} />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
          <label className="block">
            <span className="block text-sm font-semibold text-sage-800 mb-1.5">Category</span>
            <div className="relative">
              <select value={category} onChange={(e) => setCategory(e.target.value)} className="w-full appearance-none rounded-lg border border-sage-200 px-4 py-3 pr-10 text-sage-800 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-sage-500">
                {CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
              <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-sage-400 pointer-events-none" />
            </div>
          </label>
          <Field label="Sort order" type="number" value={sortOrder} onChange={setSortOrder} />
        </div>
        <label className="block mt-4">
          <span className="block text-sm font-semibold text-sage-800 mb-1.5">Description</span>
          <textarea rows={2} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Brief summary shown in lists" className="w-full rounded-lg border border-sage-200 px-4 py-3 text-sage-800 placeholder:text-sage-300 focus:outline-none focus:ring-2 focus:ring-sage-500 text-sm resize-y" />
        </label>
      </Section>

      <Section title="Content">
        <textarea rows={12} value={content} onChange={(e) => setContent(e.target.value)} placeholder="Full training content…" className="w-full rounded-lg border border-sage-200 px-4 py-3 text-sage-800 placeholder:text-sage-300 focus:outline-none focus:ring-2 focus:ring-sage-500 text-sm resize-y font-mono" />
      </Section>

      <Section title="Settings">
        <div className="flex gap-3 mb-4">
          <button type="button" onClick={() => setStatus('active')} className={clsx('px-4 py-2 rounded-lg text-sm font-medium transition-colors', status === 'active' ? 'bg-emerald-100 text-emerald-700 border border-emerald-300' : 'bg-sage-100 text-sage-600 hover:bg-sage-200')}>Active</button>
          <button type="button" onClick={() => setStatus('inactive')} className={clsx('px-4 py-2 rounded-lg text-sm font-medium transition-colors', status === 'inactive' ? 'bg-gray-200 text-gray-700 border border-gray-300' : 'bg-sage-100 text-sage-600 hover:bg-sage-200')}>Inactive</button>
        </div>
        <div className="space-y-3">
          <label className="flex items-center gap-3 cursor-pointer">
            <input type="checkbox" checked={requiresAck} onChange={(e) => setRequiresAck(e.target.checked)} className="rounded border-sage-300 text-sage-500 focus:ring-sage-500" />
            <span className="text-sm text-sage-800">Requires acknowledgement</span>
          </label>
          <label className="flex items-center gap-3 cursor-pointer">
            <input type="checkbox" checked={requiresCompletion} onChange={(e) => setRequiresCompletion(e.target.checked)} className="rounded border-sage-300 text-sage-500 focus:ring-sage-500" />
            <span className="text-sm text-sage-800">Requires completion</span>
          </label>
        </div>
      </Section>

      {error && <p className="text-red-600 text-sm bg-red-50 rounded-lg px-4 py-3">{error}</p>}

      <div className="flex items-center gap-4">
        <button type="submit" disabled={isPending} className="bg-sage-500 text-white font-semibold px-6 py-3 rounded-lg hover:bg-sage-700 transition-colors disabled:opacity-50">
          {isPending ? 'Saving…' : isEdit ? 'Save Changes' : 'Create Module'}
        </button>
        <a href={isEdit ? `/portal/training/${module!.id}` : '/portal/training'} className="text-sm text-sage-600 hover:text-sage-800">Cancel</a>
      </div>
    </form>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return <fieldset><legend className="text-lg font-semibold text-sage-800 mb-4">{title}</legend>{children}</fieldset>
}

function Field({ label, required, value, onChange, type }: { label: string; required?: boolean; value: string; onChange: (v: string) => void; type?: string }) {
  return (
    <label className="block">
      <span className="block text-sm font-semibold text-sage-800 mb-1.5">{label}{required && <span className="text-red-500 ml-0.5">*</span>}</span>
      <input type={type} value={value} onChange={(e) => onChange(e.target.value)} required={required} className="w-full rounded-lg border border-sage-200 px-4 py-3 text-sage-800 placeholder:text-sage-300 focus:outline-none focus:ring-2 focus:ring-sage-500 text-sm" />
    </label>
  )
}
