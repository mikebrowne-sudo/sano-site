// Phase 5.1 — Applicant detail page.
//
// Renders all wizard fields plus stage-based actions, trial scheduling,
// rejection/on-hold reasons, staff notes, and an audit-log timeline.

import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase-server'
import { ArrowLeft } from 'lucide-react'
import { ApplicantStatusForm } from './_components/ApplicantStatusForm'
import { ApplicantNotesForm } from './_components/ApplicantNotesForm'
import { ApplicantStageActions } from './_components/ApplicantStageActions'
import { ApplicantTrialSection } from './_components/ApplicantTrialSection'
import { StartOnboardingButton } from './_components/StartOnboardingButton'

function fmtDate(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-NZ', { day: 'numeric', month: 'short', year: 'numeric' })
}

function fmtDateTime(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('en-NZ', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

function YN(v: boolean | null | undefined) {
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

const ACTION_LABELS: Record<string, string> = {
  'applicant.status_changed':            'Status changed',
  'applicant.rejected':                  'Rejected',
  'applicant.on_hold':                   'Put on hold',
  'applicant.trial_required_changed':    'Trial-required toggled',
  'applicant.trial_scheduled':           'Trial scheduled',
  'applicant.trial_outcome_recorded':    'Trial outcome',
  'applicant_converted_to_contractor':   'Converted to contractor',
}

function describeAuditEntry(entry: AuditEntry): string {
  const after = (entry.after ?? {}) as Record<string, unknown>
  if (entry.action === 'applicant.status_changed') {
    const before = (entry.before ?? {}) as Record<string, unknown>
    return `${(before.status as string) ?? '—'} → ${(after.status as string) ?? '—'}`
  }
  if (entry.action === 'applicant.rejected') {
    return `Reason: ${(after.rejection_reason as string) ?? '(none)'}`
  }
  if (entry.action === 'applicant.on_hold') {
    return `Reason: ${(after.on_hold_reason as string) ?? '(none)'}`
  }
  if (entry.action === 'applicant.trial_required_changed') {
    return after.trial_required ? 'Trial required: ON' : 'Trial required: OFF'
  }
  if (entry.action === 'applicant.trial_scheduled') {
    return `Scheduled for ${fmtDateTime((after.trial_scheduled_for as string) ?? null)}`
  }
  if (entry.action === 'applicant.trial_outcome_recorded') {
    return `Outcome: ${(after.trial_outcome as string) ?? '(none)'}`
  }
  return ''
}

type AuditEntry = {
  id: string
  action: string
  created_at: string
  before: Record<string, unknown> | null
  after: Record<string, unknown> | null
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

  const { data: auditRows } = await supabase
    .from('audit_log')
    .select('id, action, created_at, before, after')
    .eq('entity_table', 'applicants')
    .eq('entity_id', params.id)
    .order('created_at', { ascending: false })
    .limit(50)
  const audit: AuditEntry[] = (auditRows ?? []) as AuditEntry[]

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

      <div className="flex items-start justify-between mb-4 gap-4 flex-wrap">
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

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 mb-6">
        <h2 className="text-base font-semibold text-sage-800 mb-3">Stage actions</h2>
        <ApplicantStageActions applicantId={a.id} status={a.status} />
        <p className="text-xs text-sage-500 mt-3">
          Recommended forward action for the current stage. The status select above is also available for any non-recommended override.
        </p>
      </div>

      {/* Phase 5.2 — Conversion CTA + result panel.
          Show only when the applicant has reached `approved` (or has
          already been converted, in which case the component renders
          the link to the contractor record). */}
      {(a.status === 'approved' || a.converted_contractor_id) && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 mb-6">
          <h2 className="text-base font-semibold text-sage-800 mb-1">Onboarding</h2>
          <p className="text-sm text-sage-600 mb-4">
            Once you&apos;re ready to bring them in, start onboarding to create the worker profile.
          </p>
          <StartOnboardingButton
            applicantId={a.id}
            applicationType={a.application_type as string | null}
            alreadyConvertedContractorId={(a.converted_contractor_id as string | null) ?? null}
          />
        </div>
      )}

      <ApplicantTrialSection
        applicantId={a.id}
        status={a.status}
        trialRequired={a.trial_required ?? true}
        trialScheduledFor={a.trial_scheduled_for ?? null}
        trialOutcome={a.trial_outcome ?? null}
      />

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
        <Field label="Current status">
          <span className="capitalize">{(a.status as string).replace(/_/g, ' ')}</span>
        </Field>
        <Field label="Status updated">{fmtDateTime(a.status_updated_at)}</Field>
        {a.rejection_reason && (
          <Field label="Rejection reason"><p className="whitespace-pre-line text-red-700">{a.rejection_reason}</p></Field>
        )}
        {a.on_hold_reason && (
          <Field label="On-hold reason"><p className="whitespace-pre-line text-amber-700">{a.on_hold_reason}</p></Field>
        )}
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

      <Section title="Activity">
        {audit.length === 0 ? (
          <p className="text-sm text-sage-500">No status changes recorded yet.</p>
        ) : (
          <ul className="divide-y divide-gray-50">
            {audit.map((e) => (
              <li key={e.id} className="py-2.5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-sage-800">{ACTION_LABELS[e.action] ?? e.action}</p>
                    <p className="text-xs text-sage-600 mt-0.5">{describeAuditEntry(e)}</p>
                  </div>
                  <p className="text-[11px] text-sage-500 whitespace-nowrap">{fmtDateTime(e.created_at)}</p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Section>
    </div>
  )
}
