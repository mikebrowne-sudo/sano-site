'use client'

import { useState } from 'react'
import type {
  ApplicationFormData,
  ApplicationFormErrors,
  ApplicationType,
  DayOfWeek,
  ExperienceType,
} from '@/types/application'
import { validateApplication, createEmptyApplicationForm } from '@/lib/applicationValidation'

// ---------- Shared styling constants ----------

const inputBase =
  'w-full rounded-xl border px-4 py-3 text-sm bg-sage-50 text-gray-800 focus:outline-none focus:ring-2 focus:ring-sage-300'
const inputOk = 'border-sage-100'
const inputErr = 'border-red-300'
const labelBase = 'block text-sm font-medium text-gray-700 mb-1.5'
const cardBase = 'rounded-2xl border border-sage-100 bg-white p-6 sm:p-8'
const sectionTitle = 'text-lg font-semibold text-sage-800'
const helper = 'text-xs text-gray-500 mt-1'

// ---------- Inline helpers: yes/no pills, chip multi-select ----------

function YesNoPills({
  name,
  value,
  onChange,
  error,
}: {
  name: string
  value: boolean | null
  onChange: (v: boolean) => void
  error?: string
}) {
  const pill = (selected: boolean) =>
    `px-5 py-2 rounded-full border text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-sage-300 ${
      selected
        ? 'bg-sage-800 text-white border-sage-800'
        : error
        ? 'bg-white border-red-300 text-gray-700 hover:border-sage-300'
        : 'bg-white border-sage-100 text-gray-700 hover:border-sage-300'
    }`

  return (
    <div role="radiogroup" aria-labelledby={`${name}-label`} className="flex gap-3">
      <button
        type="button"
        role="radio"
        aria-checked={value === true}
        onClick={() => onChange(true)}
        className={pill(value === true)}
      >
        Yes
      </button>
      <button
        type="button"
        role="radio"
        aria-checked={value === false}
        onClick={() => onChange(false)}
        className={pill(value === false)}
      >
        No
      </button>
    </div>
  )
}

function Chip({
  selected,
  onClick,
  children,
}: {
  selected: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      className={`px-4 py-2 rounded-full border text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-sage-300 ${
        selected
          ? 'bg-sage-800 text-white border-sage-800'
          : 'bg-white border-sage-100 text-gray-700 hover:border-sage-300'
      }`}
    >
      {children}
    </button>
  )
}

// ---------- Data: multi-select options ----------

const EXPERIENCE_OPTIONS: { value: ExperienceType; label: string }[] = [
  { value: 'residential', label: 'Residential cleaning' },
  { value: 'deep', label: 'Deep cleaning' },
  { value: 'end_of_tenancy', label: 'End of tenancy' },
  { value: 'commercial', label: 'Commercial' },
  { value: 'carpet_upholstery', label: 'Carpet & upholstery' },
  { value: 'windows', label: 'Window cleaning' },
  { value: 'post_construction', label: 'Post-construction' },
  { value: 'other', label: 'Other' },
]

const DAY_OPTIONS: { value: DayOfWeek; label: string }[] = [
  { value: 'mon', label: 'Mon' },
  { value: 'tue', label: 'Tue' },
  { value: 'wed', label: 'Wed' },
  { value: 'thu', label: 'Thu' },
  { value: 'fri', label: 'Fri' },
  { value: 'sat', label: 'Sat' },
  { value: 'sun', label: 'Sun' },
]

const APPLICATION_TYPE_OPTIONS: { value: ApplicationType; label: string }[] = [
  { value: 'contractor', label: 'Contractor' },
  { value: 'casual', label: 'Casual' },
  { value: 'either', label: 'Either' },
]

// ---------- Main component ----------

export function JobApplicationForm() {
  const [form, setForm] = useState<ApplicationFormData>(createEmptyApplicationForm())
  const [errors, setErrors] = useState<ApplicationFormErrors>({})
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [errorMessage, setErrorMessage] = useState('')

  function update<K extends keyof ApplicationFormData>(key: K, value: ApplicationFormData[K]) {
    setForm((prev) => ({ ...prev, [key]: value }))
    if (errors[key]) {
      setErrors((prev) => ({ ...prev, [key]: undefined }))
    }
  }

  function toggleArrayMember<T>(arr: T[], value: T): T[] {
    return arr.includes(value) ? arr.filter((v) => v !== value) : [...arr, value]
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    // Trim email at the submit boundary only — do not mutate visible form state.
    const trimmed: ApplicationFormData = { ...form, email: form.email.trim() }
    const validationErrors = validateApplication(trimmed)
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors)
      // Scroll to first error
      const firstKey = Object.keys(validationErrors)[0]
      const el = document.querySelector(`[data-field="${firstKey}"]`)
      el?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      return
    }

    setStatus('loading')
    try {
      const res = await fetch('/api/submit-application', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(trimmed),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || 'Submission failed')
      }
      setStatus('success')
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Something went wrong. Please try again.')
      setStatus('error')
    }
  }

  // ---------- Success card ----------

  if (status === 'success') {
    return (
      <div role="status" className="bg-sage-50 border border-sage-100 rounded-2xl p-8 text-center">
        <p className="text-4xl mb-4" aria-hidden="true">✓</p>
        <h3 className="text-sage-800 text-xl font-semibold mb-3">Thanks — application received</h3>
        <p className="text-gray-600 text-sm leading-relaxed">
          We&apos;ve received your application and will be in touch if it looks like a good fit. If you don&apos;t hear from us within a week, feel free to reach out at{' '}
          <a href="mailto:hello@sano.nz" className="text-sage-800 underline hover:text-sage-500">
            hello@sano.nz
          </a>
          .
        </p>
      </div>
    )
  }

  // ---------- Form ----------

  const err = (k: keyof ApplicationFormErrors) =>
    errors[k] ? (
      <p className="mt-1 text-xs text-red-500" role="alert">
        {errors[k]}
      </p>
    ) : null

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-6">
      {/* SECTION: Personal details */}
      <fieldset className={cardBase}>
        <legend className={sectionTitle}>Personal details</legend>
        <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-5">
          <div data-field="full_name">
            <label htmlFor="full_name" className={labelBase}>Full name *</label>
            <input
              id="full_name"
              type="text"
              autoComplete="name"
              value={form.full_name}
              onChange={(e) => update('full_name', e.target.value)}
              className={`${inputBase} ${errors.full_name ? inputErr : inputOk}`}
            />
            {err('full_name')}
          </div>
          <div data-field="phone">
            <label htmlFor="phone" className={labelBase}>Phone *</label>
            <input
              id="phone"
              type="tel"
              autoComplete="tel"
              value={form.phone}
              onChange={(e) => update('phone', e.target.value)}
              className={`${inputBase} ${errors.phone ? inputErr : inputOk}`}
            />
            {err('phone')}
          </div>
          <div data-field="email">
            <label htmlFor="email" className={labelBase}>Email *</label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              value={form.email}
              onChange={(e) => update('email', e.target.value)}
              className={`${inputBase} ${errors.email ? inputErr : inputOk}`}
            />
            {err('email')}
          </div>
          <div data-field="suburb">
            <label htmlFor="suburb" className={labelBase}>Suburb *</label>
            <input
              id="suburb"
              type="text"
              autoComplete="address-level2"
              value={form.suburb}
              onChange={(e) => update('suburb', e.target.value)}
              className={`${inputBase} ${errors.suburb ? inputErr : inputOk}`}
            />
            {err('suburb')}
          </div>
        </div>
      </fieldset>

      {/* SECTION: Role type */}
      <fieldset className={cardBase} data-field="application_type">
        <legend className={sectionTitle}>Role type</legend>
        <p className="mt-2 text-sm text-gray-600">Which type of work are you looking for? *</p>
        <div className="mt-4 flex flex-wrap gap-3">
          {APPLICATION_TYPE_OPTIONS.map((opt) => (
            <Chip
              key={opt.value}
              selected={form.application_type === opt.value}
              onClick={() => update('application_type', opt.value)}
            >
              {opt.label}
            </Chip>
          ))}
        </div>
        {err('application_type')}
      </fieldset>

      {/* SECTION: Licence & transport */}
      <fieldset className={cardBase}>
        <legend className={sectionTitle}>Licence & transport</legend>
        <div className="mt-5 space-y-5">
          <div data-field="has_license">
            <p id="has_license-label" className={labelBase}>Do you have a driver&apos;s licence? *</p>
            <YesNoPills name="has_license" value={form.has_license} onChange={(v) => update('has_license', v)} error={errors.has_license} />
            {err('has_license')}
          </div>
          <div data-field="has_vehicle">
            <p id="has_vehicle-label" className={labelBase}>Do you have your own vehicle? *</p>
            <YesNoPills name="has_vehicle" value={form.has_vehicle} onChange={(v) => update('has_vehicle', v)} error={errors.has_vehicle} />
            {err('has_vehicle')}
          </div>
          <div data-field="can_travel">
            <p id="can_travel-label" className={labelBase}>Are you able to travel to different jobs? *</p>
            <YesNoPills name="can_travel" value={form.can_travel} onChange={(v) => update('can_travel', v)} error={errors.can_travel} />
            {err('can_travel')}
          </div>
        </div>
      </fieldset>

      {/* SECTION: Experience */}
      <fieldset className={cardBase}>
        <legend className={sectionTitle}>Experience</legend>
        <div className="mt-5 space-y-5">
          <div data-field="has_experience">
            <p id="has_experience-label" className={labelBase}>Do you have cleaning experience? *</p>
            <YesNoPills name="has_experience" value={form.has_experience} onChange={(v) => update('has_experience', v)} error={errors.has_experience} />
            {err('has_experience')}
          </div>
          {form.has_experience === true && (
            <div data-field="experience_types">
              <p className={labelBase}>What types? *</p>
              <p className={helper}>Select all that apply.</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {EXPERIENCE_OPTIONS.map((opt) => (
                  <Chip
                    key={opt.value}
                    selected={form.experience_types.includes(opt.value)}
                    onClick={() => update('experience_types', toggleArrayMember(form.experience_types, opt.value))}
                  >
                    {opt.label}
                  </Chip>
                ))}
              </div>
              {err('experience_types')}
            </div>
          )}
          <div>
            <label htmlFor="experience_notes" className={labelBase}>Anything else about your experience?</label>
            <textarea
              id="experience_notes"
              rows={3}
              value={form.experience_notes}
              onChange={(e) => update('experience_notes', e.target.value)}
              className={`${inputBase} ${inputOk} resize-none`}
            />
          </div>
        </div>
      </fieldset>

      {/* SECTION: Equipment */}
      <fieldset className={cardBase}>
        <legend className={sectionTitle}>Equipment</legend>
        <div className="mt-5 space-y-5">
          <div data-field="has_equipment">
            <p id="has_equipment-label" className={labelBase}>Do you have your own cleaning equipment? *</p>
            <YesNoPills name="has_equipment" value={form.has_equipment} onChange={(v) => update('has_equipment', v)} error={errors.has_equipment} />
            {err('has_equipment')}
          </div>
          <div>
            <label htmlFor="equipment_notes" className={labelBase}>Notes about your equipment</label>
            <textarea
              id="equipment_notes"
              rows={3}
              value={form.equipment_notes}
              onChange={(e) => update('equipment_notes', e.target.value)}
              className={`${inputBase} ${inputOk} resize-none`}
            />
          </div>
        </div>
      </fieldset>

      {/* SECTION: Availability */}
      <fieldset className={cardBase}>
        <legend className={sectionTitle}>Availability</legend>
        <div className="mt-5 space-y-5">
          <div>
            <p className={labelBase}>Which days are you generally available?</p>
            <p className={helper}>Tap the days you&apos;re generally available.</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {DAY_OPTIONS.map((opt) => (
                <Chip
                  key={opt.value}
                  selected={form.available_days.includes(opt.value)}
                  onClick={() => update('available_days', toggleArrayMember(form.available_days, opt.value))}
                >
                  {opt.label}
                </Chip>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <label htmlFor="preferred_hours" className={labelBase}>Preferred hours</label>
              <input
                id="preferred_hours"
                type="text"
                placeholder="e.g. mornings, school hours"
                value={form.preferred_hours}
                onChange={(e) => update('preferred_hours', e.target.value)}
                className={`${inputBase} ${inputOk}`}
              />
            </div>
            <div>
              <label htmlFor="travel_areas" className={labelBase}>Areas you can travel to</label>
              <input
                id="travel_areas"
                type="text"
                placeholder="e.g. Central, North Shore"
                value={form.travel_areas}
                onChange={(e) => update('travel_areas', e.target.value)}
                className={`${inputBase} ${inputOk}`}
              />
            </div>
          </div>
        </div>
      </fieldset>

      {/* SECTION: Additional questions */}
      <fieldset className={cardBase}>
        <legend className={sectionTitle}>Additional questions</legend>
        <div className="mt-5 space-y-5">
          <div>
            <label htmlFor="work_preferences" className={labelBase}>Any work preferences or restrictions?</label>
            <textarea
              id="work_preferences"
              rows={3}
              value={form.work_preferences}
              onChange={(e) => update('work_preferences', e.target.value)}
              className={`${inputBase} ${inputOk} resize-none`}
            />
          </div>
          <div data-field="independent_work">
            <p id="independent_work-label" className={labelBase}>Are you comfortable working independently? *</p>
            <YesNoPills name="independent_work" value={form.independent_work} onChange={(v) => update('independent_work', v)} error={errors.independent_work} />
            {err('independent_work')}
          </div>
          <div>
            <label htmlFor="why_join_sano" className={labelBase}>Why do you want to join Sano?</label>
            <textarea
              id="why_join_sano"
              rows={3}
              value={form.why_join_sano}
              onChange={(e) => update('why_join_sano', e.target.value)}
              className={`${inputBase} ${inputOk} resize-none`}
            />
          </div>
        </div>
      </fieldset>

      {/* SECTION: Compliance */}
      <fieldset className={cardBase}>
        <legend className={sectionTitle}>Compliance</legend>
        <div className="mt-5 space-y-5">
          <div data-field="work_rights_nz">
            <p id="work_rights_nz-label" className={labelBase}>Do you have the right to work in New Zealand? *</p>
            <YesNoPills name="work_rights_nz" value={form.work_rights_nz} onChange={(v) => update('work_rights_nz', v)} error={errors.work_rights_nz} />
            {err('work_rights_nz')}
          </div>
          <div>
            <p id="has_insurance-label" className={labelBase}>Do you currently have public liability insurance?</p>
            <YesNoPills name="has_insurance" value={form.has_insurance} onChange={(v) => update('has_insurance', v)} />
          </div>
          <div>
            <p id="willing_to_get_insurance-label" className={labelBase}>If needed, would you be willing to get insured?</p>
            <YesNoPills name="willing_to_get_insurance" value={form.willing_to_get_insurance} onChange={(v) => update('willing_to_get_insurance', v)} />
          </div>
        </div>
      </fieldset>

      {/* SECTION: Declaration */}
      <fieldset className={cardBase} data-field="confirm_truth">
        <legend className={sectionTitle}>Declaration</legend>
        <label className="mt-5 flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={form.confirm_truth}
            onChange={(e) => update('confirm_truth', e.target.checked)}
            className="mt-1 h-4 w-4 rounded border-sage-100 text-sage-800 focus:ring-sage-300"
          />
          <span className="text-sm text-gray-700 leading-relaxed">
            I confirm the information I&apos;ve provided is true and accurate. *
          </span>
        </label>
        {err('confirm_truth')}
      </fieldset>

      {/* Error banner */}
      {status === 'error' && (
        <p className="text-sm text-red-500 bg-red-50 border border-red-200 rounded-xl px-4 py-3" role="alert">
          {errorMessage}
        </p>
      )}

      {/* Submit */}
      <button
        type="submit"
        disabled={status === 'loading'}
        className="w-full rounded-full bg-sage-800 px-6 py-4 font-medium text-white hover:bg-sage-500 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
      >
        {status === 'loading' ? 'Sending…' : 'Apply Now'}
      </button>
    </form>
  )
}
