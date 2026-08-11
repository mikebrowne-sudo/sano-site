import { notFound } from 'next/navigation'
import Link from 'next/link'
import { Link2, Download } from 'lucide-react'
import { BackLink } from '../../_components/BackLink'
import { createClient } from '@/lib/supabase-server'
import { isAdminUser } from '@/lib/is-admin'
import { EmploymentAgreementDocument, agreementViewFromRow } from '@/components/EmploymentAgreementDocument'
import { liveDraftAgreementView } from '@/lib/agreement-schedule-snapshot'
import { CopyLinkButton } from './_components/CopyLinkButton'
import { SendLinkForm } from './_components/SendLinkForm'
import { ScheduleSelector, type EligibleSchedule } from './_components/ScheduleSelector'
import { VoidAgreementButton } from './_components/VoidAgreementButton'
import { formatDate } from '@/lib/format'

export const dynamic = 'force-dynamic'

export default async function AgreementDetailPage({ params }: { params: { id: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!isAdminUser(user)) notFound()

  const { data: a } = await supabase.from('employment_agreements').select('*').eq('id', params.id).maybeSingle()
  if (!a) notFound()

  const origin = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://sano.nz'
  const link = `${origin}/agreement/${a.token}`
  const signed = a.status === 'signed'

  // Staff preview of a contractor DRAFT: show ONLY the SELECTED schedules + the
  // live insurance arrangement, unless a snapshot already exists (sent/signed →
  // the frozen set wins). Shared with the print/PDF route so preview == PDF.
  const selectedIds = (a.selected_service_schedule_ids as string[] | null) ?? []
  const view = agreementViewFromRow(a)
  const live = await liveDraftAgreementView(supabase, a)
  if (live.scheduleBlocks) view.scheduleBlocks = live.scheduleBlocks
  if (live.insuranceArrangement !== undefined && !a.service_schedules_snapshot) view.insuranceArrangement = live.insuranceArrangement

  // Eligible schedules for the selection UI (unsigned contractor agreements only).
  let eligible: EligibleSchedule[] = []
  if (!signed && a.agreement_type === 'contractor' && a.contractor_id) {
    const { data: sched } = await supabase
      .from('contractor_service_schedules')
      .select('id, name, status, payment_method, payment_basis, agreed_amount')
      .eq('contractor_id', a.contractor_id as string)
      .in('status', ['draft', 'active'])
      .order('created_at', { ascending: true })
    eligible = (sched ?? []).map((s) => ({
      id: s.id as string,
      name: (s.name as string | null) ?? '',
      status: (s.status as string) ?? 'draft',
      paymentMethod: (s.payment_method as string | null) ?? null,
      paymentBasis: (s.payment_basis as string | null) ?? null,
      agreedAmount: s.agreed_amount == null ? null : Number(s.agreed_amount),
    }))
  }

  return (
    <div className="max-w-3xl">
      <div className="flex items-center justify-between mb-4">
        <BackLink fallbackHref="/portal/agreements" label="Employment agreements" />
        <a
          href={`/api/agreements/${a.id}/pdf`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 border border-sage-200 text-sage-700 font-medium px-3.5 py-2 rounded-lg text-sm hover:bg-sage-50"
        >
          <Download size={15} /> Download PDF
        </a>
      </div>

      {a.is_test && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 mb-6 text-sm text-amber-800">
          <span className="font-semibold uppercase tracking-wide text-[11px] mr-2">Test run</span>
          Signing this won&apos;t create a contractor/employee record, and only you are emailed — safe to dry-run.
        </div>
      )}

      {!signed && a.agreement_type === 'contractor' && a.contractor_id && (
        <ScheduleSelector
          agreementId={a.id as string}
          eligible={eligible}
          selectedIds={selectedIds}
          noSchedules={!!a.no_service_schedules}
          noScheduleReason={(a.no_service_schedules_reason as string | null) ?? null}
        />
      )}

      {a.status === 'voided' && (
        <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 mb-6 text-sm text-gray-600">
          This agreement is <strong>voided</strong>{a.voided_at ? ` (${formatDate(a.voided_at)})` : ''} — its link can no longer be signed. Send a new link below to re-activate it with the current terms.
        </div>
      )}

      {!signed && (
        <div className="rounded-xl border border-sage-200 bg-white p-5 mb-6">
          <p className="flex items-center gap-2 text-sm font-semibold text-sage-800 mb-1"><Link2 size={15} className="text-sage-500" /> Send this link to {a.person_label || 'the employee'}</p>
          <p className="text-[11px] mb-2">
            {a.status === 'voided'
              ? <span className="text-gray-500">Voided — sending re-activates it.</span>
              : a.last_sent_at
                ? <span className="text-amber-600">Last sent {formatDate(a.last_sent_at)} · awaiting signature.</span>
                : <span className="text-sage-400">Not sent yet.</span>}
          </p>
          <CopyLinkButton url={link} />
          <p className="text-[11px] text-sage-400 mt-2">They open it, fill their details, and e-sign. You&apos;ll see the signed copy here. Editing the schedule updates this draft automatically — re-send to give them the latest version.</p>
          {!a.is_test && <SendLinkForm agreementId={a.id as string} defaultEmail={(a.employee_email as string | null) ?? ''} />}
          {a.status !== 'voided' && <VoidAgreementButton agreementId={a.id as string} />}
        </div>
      )}

      {signed && (a.contractor_id || a.employee_id) && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 mb-6 text-sm text-emerald-800">
          Saved to the workforce area ·{' '}
          <Link href={a.contractor_id ? `/portal/contractors/${a.contractor_id}` : `/portal/employees/${a.employee_id}`} className="font-semibold underline">
            View {a.contractor_id ? 'contractor' : 'employee'} record
          </Link>
        </div>
      )}

      <EmploymentAgreementDocument a={view} wrapper="share-page" />
    </div>
  )
}
