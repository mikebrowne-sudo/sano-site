'use client'

import { useState, useTransition } from 'react'
import clsx from 'clsx'
import { createLeadAction, updateLeadAction, type LeadInput } from '../_actions'
import {
  LEAD_INDUSTRIES,
  QUALITY_RANKS,
  QUALITY_RANK_LABELS,
  type QualityRank,
  type SalesLead,
} from '@/lib/campaigns/constants'

export function LeadForm({ lead }: { lead?: SalesLead }) {
  const isEdit = !!lead?.id

  const [company, setCompany] = useState(lead?.company ?? '')
  const [industry, setIndustry] = useState(lead?.industry ?? 'office')
  const [website, setWebsite] = useState(lead?.website ?? '')
  const [staffSize, setStaffSize] = useState(lead?.staff_size ?? '')
  const [address, setAddress] = useState(lead?.address ?? '')
  const [contactName, setContactName] = useState(lead?.contact_name ?? '')
  const [contactRole, setContactRole] = useState(lead?.contact_role ?? '')
  const [email, setEmail] = useState(lead?.email ?? '')
  const [phone, setPhone] = useState(lead?.phone ?? '')
  const [linkedin, setLinkedin] = useState(lead?.linkedin_url ?? '')
  const [source, setSource] = useState(lead?.source ?? '')
  const [rank, setRank] = useState<QualityRank>(lead?.quality_rank ?? 'C')
  const [notes, setNotes] = useState(lead?.notes ?? '')
  const [followUp, setFollowUp] = useState(lead?.next_follow_up ?? '')

  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSaved(false)
    if (!company.trim()) {
      setError('Company name is required.')
      return
    }

    const input: LeadInput = {
      company: company.trim(),
      industry: industry || undefined,
      website: website.trim() || undefined,
      staff_size: staffSize.trim() || undefined,
      address: address.trim() || undefined,
      contact_name: contactName.trim() || undefined,
      contact_role: contactRole.trim() || undefined,
      email: email.trim() || undefined,
      phone: phone.trim() || undefined,
      linkedin_url: linkedin.trim() || undefined,
      source: source.trim() || undefined,
      quality_rank: rank,
      notes: notes.trim() || undefined,
      next_follow_up: followUp || undefined,
    }

    startTransition(async () => {
      const result = isEdit
        ? await updateLeadAction(lead!.id, input)
        : await createLeadAction(input)
      if (result?.error) {
        setError(result.error)
      } else if (isEdit) {
        setSaved(true)
        setTimeout(() => setSaved(false), 3000)
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-2xl space-y-10">
      <section>
        <h2 className="text-lg font-semibold text-sage-800 mb-4">Company</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Company name" required value={company} onChange={setCompany} />
          <SelectField label="Industry" value={industry} onChange={setIndustry}>
            {LEAD_INDUSTRIES.map((i) => (
              <option key={i} value={i}>{i.charAt(0).toUpperCase() + i.slice(1)}</option>
            ))}
          </SelectField>
          <Field label="Website" value={website} onChange={setWebsite} placeholder="https://" />
          <Field label="Staff size" value={staffSize} onChange={setStaffSize} placeholder="e.g. 20-50" />
        </div>
        <Field label="Address" value={address} onChange={setAddress} className="mt-4" />
      </section>

      <section>
        <h2 className="text-lg font-semibold text-sage-800 mb-4">Contact</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Contact name" value={contactName} onChange={setContactName} />
          <Field label="Role" value={contactRole} onChange={setContactRole} placeholder="e.g. Practice Manager" />
          <Field label="Email" type="email" value={email} onChange={setEmail} />
          <Field label="Phone" value={phone} onChange={setPhone} />
        </div>
        <Field label="LinkedIn URL" value={linkedin} onChange={setLinkedin} className="mt-4" placeholder="https://www.linkedin.com/..." />
      </section>

      <section>
        <h2 className="text-lg font-semibold text-sage-800 mb-4">Qualification</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <SelectField label="Quality rank" value={rank} onChange={(v) => setRank(v as QualityRank)}>
            {QUALITY_RANKS.map((r) => (
              <option key={r} value={r}>{QUALITY_RANK_LABELS[r]}</option>
            ))}
          </SelectField>
          <Field label="Source" value={source} onChange={setSource} placeholder="e.g. Research 2026-07, referral" />
          <Field label="Next follow-up" type="date" value={followUp} onChange={setFollowUp} />
        </div>
        <label className="block mt-4">
          <span className="block text-sm font-semibold text-sage-800 mb-1.5">Notes</span>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={4}
            className="w-full rounded-lg border border-sage-200 px-4 py-3 text-sage-800 placeholder:text-sage-300 focus:outline-none focus:ring-2 focus:ring-sage-500 focus:border-transparent text-sm"
          />
        </label>
      </section>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 text-sm">{error}</div>
      )}
      {saved && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-green-700 text-sm">Saved.</div>
      )}

      <button
        type="submit"
        disabled={isPending}
        className={clsx(
          'inline-flex items-center gap-2 bg-sage-700 text-white font-medium px-6 py-3 rounded-lg text-sm transition-colors',
          isPending ? 'opacity-60 cursor-not-allowed' : 'hover:bg-sage-600'
        )}
      >
        {isPending ? 'Saving…' : isEdit ? 'Save changes' : 'Create lead'}
      </button>
    </form>
  )
}

function Field({
  label,
  required,
  className,
  value,
  onChange,
  ...rest
}: {
  label: string
  required?: boolean
  className?: string
  value: string
  onChange: (v: string) => void
  type?: string
  placeholder?: string
}) {
  return (
    <label className={clsx('block', className)}>
      <span className="block text-sm font-semibold text-sage-800 mb-1.5">
        {label}
        {required && <span className="text-red-500 ml-0.5">*</span>}
      </span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        className="w-full rounded-lg border border-sage-200 px-4 py-3 text-sage-800 placeholder:text-sage-300 focus:outline-none focus:ring-2 focus:ring-sage-500 focus:border-transparent text-sm"
        {...rest}
      />
    </label>
  )
}

function SelectField({
  label,
  value,
  onChange,
  children,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  children: React.ReactNode
}) {
  return (
    <label className="block">
      <span className="block text-sm font-semibold text-sage-800 mb-1.5">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg border border-sage-200 px-4 py-3 text-sage-800 focus:outline-none focus:ring-2 focus:ring-sage-500 focus:border-transparent text-sm bg-white"
      >
        {children}
      </select>
    </label>
  )
}
