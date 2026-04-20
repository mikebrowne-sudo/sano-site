'use client'

import type { ApplicationFormData, DayOfWeek, ExperienceType } from '@/types/application'

interface ReviewStepProps {
  data: ApplicationFormData
  status: 'idle' | 'submitting' | 'error'
  errorMessage?: string
  onSubmit: () => void
}

const EXPERIENCE_LABELS: Record<ExperienceType, string> = {
  residential: 'Residential cleaning',
  deep: 'Deep cleaning',
  end_of_tenancy: 'End of tenancy',
  commercial: 'Commercial',
  carpet_upholstery: 'Carpet & upholstery',
  windows: 'Window cleaning',
  post_construction: 'Post-construction',
  other: 'Other',
}

const DAY_LABELS: Record<DayOfWeek, string> = {
  mon: 'Mon', tue: 'Tue', wed: 'Wed', thu: 'Thu', fri: 'Fri', sat: 'Sat', sun: 'Sun',
}

function yesNo(v: boolean | null): string {
  return v === true ? 'Yes' : v === false ? 'No' : '\u2014'
}

function orDash(v: string): string {
  return v.trim() ? v : '\u2014'
}

export function ReviewStep({ data, status, errorMessage, onSubmit }: ReviewStepProps) {
  const rows: { label: string; value: string }[] = [
    { label: 'Name', value: `${data.first_name} ${data.last_name}`.trim() },
    { label: 'Phone', value: data.phone },
    { label: 'Email', value: data.email },
    { label: 'Suburb', value: data.suburb },
    { label: 'Role type', value: data.application_type === 'contractor' ? 'Contractor' : data.application_type === 'employee' ? 'Employee' : '\u2014' },
    { label: 'Driver licence', value: yesNo(data.has_license) },
    { label: 'Vehicle', value: yesNo(data.has_vehicle) },
    { label: 'Can travel', value: yesNo(data.can_travel) },
    { label: 'Has experience', value: yesNo(data.has_experience) },
  ]

  if (data.has_experience) {
    rows.push({ label: 'Experience types', value: data.experience_types.map((t) => EXPERIENCE_LABELS[t]).join(', ') || '\u2014' })
    rows.push({ label: 'Experience notes', value: orDash(data.experience_notes) })
  }

  rows.push({ label: 'Own equipment', value: yesNo(data.has_equipment) })
  rows.push({ label: 'Available days', value: data.available_days.map((d) => DAY_LABELS[d]).join(', ') || '\u2014' })
  rows.push({ label: 'Preferred hours', value: orDash(data.preferred_hours) })
  rows.push({ label: 'Travel areas', value: orDash(data.travel_areas) })
  rows.push({ label: 'Independent work', value: yesNo(data.independent_work) })
  rows.push({ label: 'Right to work in NZ', value: yesNo(data.work_rights_nz) })

  if (data.application_type === 'contractor') {
    rows.push({ label: 'Public liability insurance', value: yesNo(data.has_insurance) })
    if (data.has_insurance === false) {
      rows.push({ label: 'Willing to arrange insurance', value: yesNo(data.willing_to_get_insurance) })
    }
  }

  rows.push({ label: 'Why Sano', value: orDash(data.why_join_sano) })

  return (
    <div>
      <h2 className="mb-6">Quick review.</h2>
      <p className="body-text mb-8">Have a look over your answers. Hit Back if you want to change anything.</p>

      <dl className="rounded-2xl border border-sage-100 bg-white divide-y divide-sage-100">
        {rows.map((row) => (
          <div key={row.label} className="flex flex-col sm:flex-row gap-2 sm:gap-6 py-4 px-5">
            <dt className="text-sm font-medium text-sage-600 sm:w-56 sm:flex-shrink-0">{row.label}</dt>
            <dd className="text-sm text-sage-800 whitespace-pre-wrap break-words">{row.value}</dd>
          </div>
        ))}
      </dl>

      {status === 'error' && (
        <p className="mt-6 text-sm text-red-500 bg-red-50 border border-red-200 rounded-xl px-4 py-3" role="alert">
          {errorMessage || 'Something went wrong. Please try again.'}
        </p>
      )}

      <button
        type="button"
        onClick={onSubmit}
        disabled={status === 'submitting'}
        className="mt-8 w-full rounded-full bg-sage-800 px-6 py-4 font-medium text-white hover:bg-sage-500 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
      >
        {status === 'submitting' ? 'Sending\u2026' : 'Submit application'}
      </button>
    </div>
  )
}
