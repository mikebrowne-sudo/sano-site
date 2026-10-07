import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft, ClipboardList, AlertTriangle } from 'lucide-react'
import { createClient } from '@/lib/supabase-server'
import { isAdminUser } from '@/lib/is-admin'
import { getContractorSetupBundle } from '@/lib/contractor-setup-data'
import { getContractorDeclarations, applicableDeclarationRecord } from '@/lib/contractor-tax-declaration-data'
import { resolveContractorTaxGate, type ScheduleTaxTreatment } from '@/lib/contractor-tax-gate'
import {
  SETUP_SECTIONS, sectionLabel, sectionState, computeReadiness, type SectionStatusMap,
} from '@/lib/contractor-setup-status'
import { formatCurrency } from '@/lib/format'
import { SectionStatusBadge } from './_components/SectionStatusBadge'
import { ScheduleEditor } from './_components/ScheduleEditor'
import { InsurancePanel } from './_components/InsurancePanel'
import { CreateSetupButton, SendLinkButton, ProposedChanges } from './_components/SetupActions'

export const dynamic = 'force-dynamic'

export default async function ContractorSetupPage({ params }: { params: { id: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!isAdminUser(user)) notFound()

  const { data: contractor } = await supabase
    .from('contractors')
    .select('id, full_name, email, business_structure, tax_treatment')
    .eq('id', params.id)
    .maybeSingle()
  if (!contractor) notFound()

  const { setup, schedules, insuranceDefault, insuranceOverrides } = await getContractorSetupBundle(params.id)
  // Clients for the schedule Customer field (e.g. Pukekohe Golf Club).
  const { data: clientRows } = await supabase
    .from('clients')
    .select('id, name')
    .eq('is_archived', false)
    .order('name', { ascending: true })
  const clients = (clientRows ?? []).map((c) => ({ id: c.id as string, name: (c.name as string | null) ?? '' }))
  // PR 4: the REAL per-schedule tax gate. Each schedule is judged on its own
  // tax_treatment against the contractor's current verified declaration — a
  // verified IR330C does NOT make every schedule schedular.
  const { history: declHistory } = await getContractorDeclarations(params.id)
  const todayIso = new Date().toISOString().slice(0, 10)
  const taxGate = resolveContractorTaxGate(
    schedules.map((s) => ({ id: s.id, name: s.name, taxTreatment: (s.taxTreatment ?? null) as ScheduleTaxTreatment })),
    applicableDeclarationRecord(declHistory, todayIso), // date-based, not newest
    todayIso,
  )
  const schedular = schedules.some((s) => s.taxTreatment === 'schedular_payment')
  const sectionStatus: SectionStatusMap = setup?.sectionStatus ?? {}
  const readiness = setup ? computeReadiness(sectionStatus, { schedular, taxGate }) : null

  return (
    <div className="max-w-4xl mx-auto">
      <Link href={`/portal/contractors/${params.id}`} className="inline-flex items-center gap-1.5 text-sm text-sage-600 hover:text-sage-800 mb-4">
        <ArrowLeft size={14} /> Back to contractor
      </Link>
      <div className="flex items-start justify-between gap-3 mb-1">
        <h1 className="text-3xl font-bold text-sage-800 tracking-tight">Contractor setup</h1>
      </div>
      <p className="text-sm text-sage-500 mb-6">{contractor.full_name} · staff-led setup. Enter what Sano knows, mark uncertain details for the contractor to confirm, then send the secure link.</p>

      {!setup ? (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 text-center">
          <ClipboardList size={26} className="mx-auto text-sage-300 mb-3" />
          <p className="text-sage-600 text-sm mb-4">No setup started for this contractor yet.</p>
          <CreateSetupButton contractorId={params.id} />
        </div>
      ) : (
        <div className="space-y-6">
          {/* Section status overview */}
          <Panel title="Setup sections" icon={ClipboardList}>
            <ul className="divide-y divide-sage-50">
              {SETUP_SECTIONS.map((s) => (
                <li key={s} className="flex items-center justify-between py-2.5">
                  <span className="text-sm text-sage-700">{sectionLabel(s)}</span>
                  <SectionStatusBadge state={sectionState(sectionStatus, s)} />
                </li>
              ))}
            </ul>
            {readiness && !readiness.paymentReady && (
              <div className="mt-3 rounded-lg bg-amber-50 border border-amber-100 px-4 py-3 text-sm text-amber-800 flex gap-2">
                <AlertTriangle size={16} className="shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium">Not payment-ready.</p>
                  <ul className="mt-1 list-disc list-inside text-xs space-y-0.5">
                    {readiness.blockers.map((b) => <li key={b.section}>{b.reason}</li>)}
                  </ul>
                </div>
              </div>
            )}
          </Panel>

          {/* Service schedules */}
          <Panel title="Service schedules">
            {schedules.length === 0 ? (
              <p className="text-sm text-sage-400 mb-3">No service schedules yet. Add one per arrangement (e.g. Pukekohe commercial cleaning, residential hourly).</p>
            ) : (
              <ul className="space-y-2 mb-3">
                {schedules.map((sch) => (
                  <li key={sch.id} className="flex items-center justify-between border border-sage-100 rounded-lg px-3 py-2.5">
                    <div className="min-w-0">
                      <span className="font-medium text-sage-800 text-sm">{sch.name}</span>
                      <span className="text-[11px] text-sage-400 ml-2">{sch.status}</span>
                      <div className="text-xs text-sage-500">
                        {sch.paymentMethod ?? '—'} · {sch.paymentBasis === 'guaranteed_net' ? 'guaranteed net' : 'gross fee'} · {sch.rateBasis === 'gst_inclusive' ? 'GST incl' : 'GST excl'}
                        {sch.agreedAmount != null && ` · ${formatCurrency(sch.agreedAmount)}`}
                      </div>
                    </div>
                    <ScheduleEditor contractorId={params.id} schedular={schedular} whtRate={null} existing={sch} clients={clients} />
                  </li>
                ))}
              </ul>
            )}
            <ScheduleEditor contractorId={params.id} schedular={schedular} whtRate={null} clients={clients} />
          </Panel>

          {/* Insurance */}
          <Panel title="Insurance arrangement">
            <InsurancePanel contractorId={params.id} existing={insuranceDefault} schedules={schedules.map((s) => ({ id: s.id, name: s.name }))} overrides={insuranceOverrides} />
          </Panel>

          {/* Deferred sections note */}
          <Panel title="Tax & GST (later workflow)">
            <p className="text-sm text-sage-600">
              GST information and the contractor tax declaration (IR330C, tailored rate, exemption) are captured through their own
              dedicated, immutable workflow in a later release. They are shown above as
              <span className="font-medium"> Blocked — later workflow</span> and correctly keep this setup out of a payment-ready state.
              {schedular && <span className="block mt-2 text-amber-700 font-medium">This contractor is classified schedular — payment stays blocked until a verified IR330C or exemption is recorded.</span>}
            </p>
          </Panel>

          {/* Review + send */}
          <Panel title="Contractor-proposed changes">
            <ProposedChanges contractorId={params.id} changes={setup.proposedChanges as Record<string, { old: unknown; new: unknown }>} />
          </Panel>

          <div className="flex flex-wrap items-center gap-3">
            <SendLinkButton contractorId={params.id} sentAt={setup.sentAt} />
            <span className="text-xs text-sage-400">Status: {setup.status.replace(/_/g, ' ')}{setup.sentAt ? ` · link sent` : ''}</span>
          </div>
        </div>
      )}
    </div>
  )
}

function Panel({ title, icon: Icon, children }: { title: string; icon?: React.ElementType; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
      <h2 className="flex items-center gap-2 text-lg font-semibold text-sage-800 mb-4">{Icon && <Icon size={18} className="text-sage-400" />}{title}</h2>
      {children}
    </div>
  )
}
