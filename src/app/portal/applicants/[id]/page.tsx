// Phase 5 — Applicant detail page.
//
// Renders all fields captured by the public application wizard, plus
// the staff-side controls (status, notes, future "convert to
// contractor"). RLS allows staff read; admin write.

import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase-server'
import { ArrowLeft } from 'lucide-react'
import { ApplicantStatusForm } from './_components/ApplicantStatusForm'
import { ApplicantNotesForm } from './_components/ApplicantNotesForm'

function fmtDate(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-NZ', { day: 'numeric', month: 'short', year: 'numeric' })
}

function fmtDateTime(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('en-NZ', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

function YN(v: boolean | null) {
  if (v === null || v === undefined) return <span className="text-gray-400">—</span>
  return v
    ? <span className="text-emerald-700 font-medium">Yes</span>
    : <span className="text-gray-500">No</span>
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[180px_1fr] gap-3 py-2 border-b border-gray-50 last:border-0">
      <dt className="text-xs uppercase tracking-wide text-sage-500 pt-1">{label}</dt>
      <dd className="text-sm text-sage-800">{children}</dd>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 mb-6">
      <h2 className="text-base font-semibold text-sage-800 mb-3">{title}</h2>
      <dl>{children}</dl>
    </div>
  )
}

export default async function ApplicantDetailPage({
  params,
}: {
  params: { id: string }
}) {
  const supabase = createClient()

  const { data: a, error } = await supabase
    .from('applicants')
    .select('*')
    .eq('id', params.id)
    .maybeSingle()

  if (error || !a) notFound()

  const exp = (a.experience_types ?? []) as string[]
  const days = (a.available_days ?? []) as string[]

  return (
    <div className="max-w-4xl">
      <Link
        href="/portal/applicants"
        className="inline-flex items-center gap-1 text-sm text-sage-600 hover:text-sage-800 mb-4"
      >
        <ArrowLeft size={14} /> All applicants
      </Link>

      <div className="flex items-start justify-between mb-6 gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl tracking-tight font-bold text-sage-800">
            {a.first_name} {a.last_name}
          </h1>
          <p className="text-sm text-sage-600 mt-1">
            {a.application_type === 'contractor' ? 'Contractor' : 'Employee'} application · submitted {fmtDate(a.created_at)}
          </p>
        </div>
        <ApplicantStatusForm applicantId={a.id} currentStatus={a.status} />
      </div>

      <Section title="Contact">
        <Field label="Email"><a href={`mailto:${a.email}`} className="text-sage-700 underline-offset-2 hover:underline">{a.email}</a></Field>
        <Field label="Phone"><a href={`tel:${a.phone}`} className="text-sage-700 underline-offset-2 hover:underline">{a.phone}</a></Field>
        <Field label="Suburb">{a.suburb}</Field>
        <Field label="Date of birth">{a.date_of_birth ? fmtDate(a.date_of_birth) : <span className="text-gray-400">Not provided</span>}</Field>
      </Section>

      <Section title="Licence & transport">
        <Field label="Driver licence">{YN(a.has_license)}</Field>
        <Field label="Vehicle access">{YN(a.has_vehicle)}</Field>
        <Field label="Comfortable travelling">{YN(a.can_travel)}</Field>
        <Field label="Travel areas">{a.travel_areas || <span className="text-gray-400">—</span>}</Field>
      </Section>

      <Section title="Experience">
        <Field label="Has experience">{YN(a.has_experience)}</Field>
        <Field label="Types">
          {exp.length === 0 ? <span className="text-gray-400">—</span> : (
            <div className="flex flex-wrap gap-1.5">
              {exp.map((e) => <span key={e} className="inline-block px-2 py-0.5 rounded-full text-xs bg-sage-50 text-sage-700 capitalize">{e.replace(/_/g, ' ')}</span>)}
            </div>
          )}
        </Field>
        <Field label="Notes">{a.experience_notes ? <p className="whitespace-pre-line">{a.experience_notes}</p> : <span className="text-gray-400">—</span>}</Field>
      </Section>

      <Section title="Availability">
        <Field label="Days">
          {days.length === 0 ? <span className="text-gray-400">—</span> : (
            <div className="flex flex-wrap gap-1.5">
              {days.map((d) => <span key={d} className="inline-block px-2 py-0.5 rounded-full text-xs bg-sage-50 text-sage-700 capitalize">{d}</span>)}
            </div>
          )}
        </Field>
        <Field label="Preferred hours">{a.preferred_hours || <span className="text-gray-400">—</span>}</Field>
      </Section>

      <Section title="Equipment & compliance">
        <Field label="Has equipment">{YN(a.has_equipment)}</Field>
        <Field label="Independent work">{YN(a.independent_work)}</Field>
        <Field label="Right to work in NZ">{YN(a.work_rights_nz)}</Field>
        <Field label="Has public liability insurance">{YN(a.has_insurance)}</Field>
        {a.application_type === 'contractor' && a.has_insurance === false && (
          <Field label="Willing to arrange insurance">{YN(a.willing_to_get_insurance)}</Field>
        )}
      </Section>

      <Section title="Motivation">
        <Field label="Why join Sano">{a.why_join_sano ? <p className="whitespace-pre-line">{a.why_join_sano}</p> : <span className="text-gray-400">—</span>}</Field>
        <Field label="Confirmed accuracy">{YN(a.confirm_truth)}</Field>
      </Section>

      <Section title="Pipeline">
        <Field label="Status updated">{fmtDateTime(a.status_updated_at)}</Field>
        {a.converted_contractor_id && (
          <Field label="Converted to">
            <Link href={`/portal/contractors/${a.converted_contractor_id}`} className="text-sage-700 underline-offset-2 hover:underline">
              View contractor record
            </Link>
            {' '} · {fmtDateTime(a.converted_at)}
          </Field>
        )}
        <Field label="Staff notes"><ApplicantNotesForm applicantId={a.id} initialNotes={a.staff_notes ?? ''} /></Field>
      </Section>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 mb-6">
        <h2 className="text-base font-semibold text-sage-800 mb-2">Convert to contractor</h2>
        <p className="text-sm text-sage-600 mb-3">
          Once an applicant is approved, they can be converted into a contractor record (carries over name, email, phone, and contract preferences). Coming in the next applicant phase.
        </p>
        <button
          type="button"
          disabled
          className="inline-flex items-center gap-2 bg-gray-100 text-gray-400 font-semibold px-4 py-2 rounded-lg text-sm cursor-not-allowed"
        >
          Convert to contractor (coming soon)
        </button>
      </div>
    </div>
  )
}
