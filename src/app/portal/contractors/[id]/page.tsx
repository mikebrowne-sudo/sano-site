import { createClient } from '@/lib/supabase-server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Pencil } from 'lucide-react'
import { DocumentUpload } from '../_components/DocumentUpload'
import { DocumentList } from '../_components/DocumentList'
import { PayPreview } from '../_components/PayPreview'
import { ComplianceBadge } from '../_components/ComplianceBadge'
import { IncidentList } from '../_components/IncidentList'
import { computeComplianceStatus } from '@/lib/contractor-compliance'
import clsx from 'clsx'

const WORKER_TYPE_STYLES: Record<string, string> = {
  contractor: 'bg-blue-50 text-blue-700',
  casual: 'bg-amber-50 text-amber-700',
  part_time: 'bg-purple-50 text-purple-700',
  full_time: 'bg-emerald-50 text-emerald-700',
}

function fmtCurrency(dollars: number | null) {
  if (dollars == null) return '—'
  return new Intl.NumberFormat('en-NZ', { style: 'currency', currency: 'NZD' }).format(dollars)
}

function fmtDate(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-NZ', { day: 'numeric', month: 'short', year: 'numeric' })
}

export default async function ContractorDetailPage({ params }: { params: { id: string } }) {
  const supabase = createClient()

  const [{ data: contractor, error }, { data: jobs, count: jobCount }, { data: documents }, { data: trainingAssignments }, { data: incidents }] = await Promise.all([
    supabase
      .from('contractors')
      .select('id, full_name, email, phone, hourly_rate, base_hourly_rate, loaded_hourly_rate, holiday_pay_percent, status, worker_type, notes, created_at, start_date, end_date, pay_frequency, standard_hours, holiday_pay_method, ird_number, tax_code, ir330_received, kiwisaver_enrolled, kiwisaver_employee_rate, kiwisaver_employer_rate, insurance_provider, insurance_policy_number, insurance_expiry, insurance_liability_cover, company_name, business_structure, nzbn, gst_registered, gst_number, bank_account_name, bank_account_number, payment_terms_days, contract_signed_date, right_to_work_required, right_to_work_expiry, service_areas, approved_services, availability_notes, has_vehicle, provides_own_equipment, key_holding_approved, alarm_access_approved, pet_friendly, experience_level, can_lead_jobs, can_work_solo, can_supervise_others, invite_sent_at, portal_access_active, auth_user_id')
      .eq('id', params.id)
      .single(),
    supabase
      .from('jobs')
      .select('id, job_number, title, status, scheduled_date', { count: 'exact' })
      .eq('contractor_id', params.id)
      .order('scheduled_date', { ascending: false })
      .limit(5),
    supabase
      .from('worker_documents')
      .select('id, document_type, title, file_path, file_size, notes, uploaded_at')
      .eq('contractor_id', params.id)
      .order('uploaded_at', { ascending: false }),
    supabase
      .from('worker_training_assignments')
      .select('id, status, due_date, completed_at, training_modules ( title, category )')
      .eq('contractor_id', params.id)
      .order('status'),
    supabase
      .from('contractor_incidents')
      .select('id, incident_date, severity, description, resolved_at, notes, created_at')
      .eq('contractor_id', params.id)
      .order('incident_date', { ascending: false }),
  ])

  if (error || !contractor) notFound()

  // Generate signed download URLs for documents
  const docs = documents ?? []
  const downloadUrls: Record<string, string> = {}
  for (const doc of docs) {
    const { data } = await supabase.storage
      .from('worker-documents')
      .createSignedUrl(doc.file_path, 3600)
    if (data?.signedUrl) {
      downloadUrls[doc.id] = data.signedUrl
    }
  }

  const workerType = contractor.worker_type ?? 'contractor'
  const compliance = computeComplianceStatus(contractor)
  const incidentList = incidents ?? []
  const openIncidentCount = incidentList.filter((i) => !i.resolved_at).length

  return (
    <div>
      <Link
        href="/portal/contractors"
        className="inline-flex items-center gap-1.5 text-sm text-sage-600 hover:text-sage-800 transition-colors mb-4"
      >
        <ArrowLeft size={14} />
        Back to contractors
      </Link>

      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-sage-800">{contractor.full_name}</h1>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <span className={clsx('inline-block px-2.5 py-0.5 rounded-full text-xs font-medium capitalize', contractor.status === 'active' ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-600')}>
              {contractor.status}
            </span>
            <span className={clsx('inline-block px-2.5 py-0.5 rounded-full text-xs font-medium capitalize', WORKER_TYPE_STYLES[workerType] ?? WORKER_TYPE_STYLES.contractor)}>
              {workerType.replace('_', ' ')}
            </span>
            <ComplianceBadge status={compliance.status} reasons={compliance.reasons} />
          </div>
        </div>
        <Link
          href={`/portal/contractors/${params.id}/edit`}
          className="inline-flex items-center gap-2 bg-sage-500 text-white font-medium px-4 py-2.5 rounded-lg text-sm hover:bg-sage-700 transition-colors"
        >
          <Pencil size={14} />
          Edit
        </Link>
      </div>

      <div className="max-w-2xl space-y-8">
        <Section title="Contact">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-sage-500">Email</span>
              <p className="text-sage-800 font-medium">{contractor.email || '—'}</p>
            </div>
            <div>
              <span className="text-sage-500">Phone</span>
              <p className="text-sage-800 font-medium">{contractor.phone || '—'}</p>
            </div>
          </div>
        </Section>

        {/* Business identity — contractor only */}
        {workerType === 'contractor' && (contractor.company_name || contractor.business_structure || contractor.nzbn) && (
          <Section title="Business identity">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
              <div><span className="text-sage-500">Trading / company name</span><p className="text-sage-800 font-medium">{contractor.company_name || '—'}</p></div>
              <div><span className="text-sage-500">Structure</span><p className="text-sage-800 font-medium capitalize">{(contractor.business_structure as string | null)?.replace('_', ' ') || '—'}</p></div>
              <div><span className="text-sage-500">NZBN</span><p className="text-sage-800 font-medium">{contractor.nzbn || '—'}</p></div>
            </div>
          </Section>
        )}

        {/* GST — contractor only */}
        {workerType === 'contractor' && (
          <Section title="GST">
            {contractor.gst_registered ? (
              <div className="flex items-center gap-3 text-sm">
                <span className="inline-block px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-medium text-xs">GST registered</span>
                <span className="text-sage-800 font-medium">{contractor.gst_number || <span className="text-amber-600">No GST number on file</span>}</span>
              </div>
            ) : (
              <p className="text-sage-500 text-sm">Not GST registered</p>
            )}
          </Section>
        )}

        <Section title="Rate">
          {workerType !== 'contractor' && contractor.base_hourly_rate ? (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
              <div>
                <span className="text-sage-500">Base rate</span>
                <p className="text-sage-800 font-medium">{fmtCurrency(contractor.base_hourly_rate)}/hr</p>
              </div>
              {contractor.holiday_pay_method === 'pay_as_you_go_8_percent' && (
                <>
                  <div>
                    <span className="text-sage-500">Holiday pay</span>
                    <p className="text-sage-800 font-medium">{contractor.holiday_pay_percent ?? 8}%</p>
                  </div>
                  <div>
                    <span className="text-sage-500">Loaded rate</span>
                    <p className="text-emerald-700 font-bold">{fmtCurrency(contractor.loaded_hourly_rate)}/hr</p>
                  </div>
                </>
              )}
            </div>
          ) : (
            <p className="text-sage-800 font-medium text-sm">{fmtCurrency(contractor.hourly_rate)}/hr</p>
          )}
        </Section>

        {/* Payment — contractor only */}
        {workerType === 'contractor' && (contractor.bank_account_number || contractor.bank_account_name || contractor.payment_terms_days != null) && (
          <Section title="Payment">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
              <div><span className="text-sage-500">Account name</span><p className="text-sage-800 font-medium">{contractor.bank_account_name || '—'}</p></div>
              <div><span className="text-sage-500">Account number</span><p className="text-sage-800 font-medium">{contractor.bank_account_number || '—'}</p></div>
              <div><span className="text-sage-500">Payment terms</span><p className="text-sage-800 font-medium">{contractor.payment_terms_days != null ? `${contractor.payment_terms_days} days` : '—'}</p></div>
            </div>
          </Section>
        )}

        {/* Employment — employees only */}
        {workerType !== 'contractor' && (
          <Section title="Employment">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
              <div><span className="text-sage-500">Start date</span><p className="text-sage-800 font-medium">{fmtDate(contractor.start_date)}</p></div>
              <div><span className="text-sage-500">End date</span><p className="text-sage-800 font-medium">{fmtDate(contractor.end_date)}</p></div>
              <div><span className="text-sage-500">Pay frequency</span><p className="text-sage-800 font-medium capitalize">{contractor.pay_frequency ?? '—'}</p></div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm mt-3">
              <div><span className="text-sage-500">Standard hours</span><p className="text-sage-800 font-medium">{contractor.standard_hours ?? '—'}</p></div>
              <div><span className="text-sage-500">Holiday pay</span><p className="text-sage-800 font-medium capitalize">{(contractor.holiday_pay_method ?? '—').replace(/_/g, ' ')}</p></div>
            </div>
          </Section>
        )}

        {/* Tax — employees only */}
        {workerType !== 'contractor' && (
          <Section title="Tax">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
              <div><span className="text-sage-500">IRD number</span><p className="text-sage-800 font-medium">{contractor.ird_number || '—'}</p></div>
              <div><span className="text-sage-500">Tax code</span><p className="text-sage-800 font-medium">{contractor.tax_code || '—'}</p></div>
              <div><span className="text-sage-500">IR330 received</span><p className={clsx('font-medium', contractor.ir330_received ? 'text-emerald-700' : 'text-amber-600')}>{contractor.ir330_received ? 'Yes' : 'No'}</p></div>
            </div>
            {!contractor.ir330_received && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 mt-3 text-sm text-amber-800">
                IR330 not received — ND tax rate (45%) will apply
              </div>
            )}
          </Section>
        )}

        {/* KiwiSaver — employees only */}
        {workerType !== 'contractor' && (
          <Section title="KiwiSaver">
            {contractor.kiwisaver_enrolled ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                <div><span className="text-sage-500">Employee rate</span><p className="text-sage-800 font-medium">{contractor.kiwisaver_employee_rate ?? 3}%</p></div>
                <div><span className="text-sage-500">Employer rate</span><p className="text-sage-800 font-medium">{contractor.kiwisaver_employer_rate ?? 3}%</p></div>
              </div>
            ) : (
              <p className="text-sage-500 text-sm">Not enrolled</p>
            )}
          </Section>
        )}

        {/* Pay preview — employees only */}
        {workerType !== 'contractor' && contractor.hourly_rate && (
          <Section title="Pay Preview">
            <PayPreview contractor={contractor} />
          </Section>
        )}

        {contractor.notes && (
          <Section title="Notes">
            <p className="text-sage-600 text-sm whitespace-pre-wrap">{contractor.notes}</p>
          </Section>
        )}

        {/* Insurance */}
        {(contractor.insurance_provider || contractor.insurance_policy_number || contractor.insurance_expiry || contractor.insurance_liability_cover) && (() => {
          const today = new Date().toISOString().slice(0, 10)
          const expiry = contractor.insurance_expiry as string | null
          const isExpired = expiry != null && expiry < today
          const daysToExpiry = expiry ? Math.round((new Date(expiry).getTime() - new Date(today).getTime()) / 86400000) : null
          const isSoon = !isExpired && daysToExpiry != null && daysToExpiry <= 30
          return (
            <Section title="Insurance">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
                <div>
                  <span className="text-sage-500">Provider</span>
                  <p className="text-sage-800 font-medium">{contractor.insurance_provider ?? '—'}</p>
                </div>
                <div>
                  <span className="text-sage-500">Policy number</span>
                  <p className="text-sage-800 font-medium">{contractor.insurance_policy_number ?? '—'}</p>
                </div>
                <div>
                  <span className="text-sage-500">Expiry</span>
                  <p className="flex items-center gap-2">
                    <span className="text-sage-800 font-medium">{fmtDate(expiry)}</span>
                    {expiry && (
                      <span className={clsx('inline-block px-2 py-0.5 rounded-full text-[10px] font-medium',
                        isExpired ? 'bg-red-50 text-red-700' : isSoon ? 'bg-amber-50 text-amber-700' : 'bg-emerald-50 text-emerald-700',
                      )}>
                        {isExpired ? 'Expired' : isSoon ? `${daysToExpiry}d left` : 'Current'}
                      </span>
                    )}
                  </p>
                </div>
              </div>
              {contractor.insurance_liability_cover != null && (
                <div className="mt-3 text-sm">
                  <span className="text-sage-500">Public liability cover</span>
                  <p className="text-sage-800 font-medium">{fmtCurrency(contractor.insurance_liability_cover)}</p>
                </div>
              )}
              {(isExpired || !expiry) && (
                <p className="mt-3 text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                  {isExpired ? 'Insurance has expired.' : 'Insurance expiry not set.'} This contractor cannot be assigned to new jobs until current insurance is recorded.
                </p>
              )}
            </Section>
          )
        })()}

        {/* Compliance — shared */}
        {(contractor.contract_signed_date || contractor.right_to_work_required || contractor.right_to_work_expiry) && (() => {
          const today = new Date().toISOString().slice(0, 10)
          const rtwExpiry = contractor.right_to_work_expiry as string | null
          const rtwExpired = contractor.right_to_work_required && rtwExpiry != null && rtwExpiry < today
          const rtwMissing = contractor.right_to_work_required && !rtwExpiry
          return (
            <Section title="Compliance">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-sage-500">Contract signed</span>
                  <p className="text-sage-800 font-medium">{fmtDate(contractor.contract_signed_date)}</p>
                </div>
                <div>
                  <span className="text-sage-500">Right to work</span>
                  {contractor.right_to_work_required ? (
                    <p className="flex items-center gap-2">
                      <span className="text-sage-800 font-medium">{fmtDate(rtwExpiry)}</span>
                      <span className={clsx('inline-block px-2 py-0.5 rounded-full text-[10px] font-medium',
                        rtwExpired ? 'bg-red-50 text-red-700' : rtwMissing ? 'bg-amber-50 text-amber-700' : 'bg-emerald-50 text-emerald-700',
                      )}>
                        {rtwExpired ? 'Expired' : rtwMissing ? 'Missing' : 'Current'}
                      </span>
                    </p>
                  ) : (
                    <p className="text-sage-500">Not required</p>
                  )}
                </div>
              </div>
            </Section>
          )
        })()}

        {/* Operational — shared */}
        {(contractor.service_areas?.length || contractor.approved_services?.length || contractor.availability_notes
          || contractor.has_vehicle || contractor.provides_own_equipment
          || contractor.key_holding_approved || contractor.alarm_access_approved || contractor.pet_friendly) && (
          <Section title="Operational">
            {(contractor.service_areas?.length ?? 0) > 0 && (
              <div className="mb-3">
                <span className="text-sage-500 text-sm">Service areas</span>
                <div className="flex flex-wrap gap-1.5 mt-1">
                  {(contractor.service_areas as string[]).map((a) => (
                    <span key={a} className="inline-block px-2 py-0.5 rounded-full bg-sage-100 text-sage-700 text-xs capitalize">{a.replace(/_/g, ' ')}</span>
                  ))}
                </div>
              </div>
            )}
            {(contractor.approved_services?.length ?? 0) > 0 && (
              <div className="mb-3">
                <span className="text-sage-500 text-sm">Approved services</span>
                <div className="flex flex-wrap gap-1.5 mt-1">
                  {(contractor.approved_services as string[]).map((s) => (
                    <span key={s} className="inline-block px-2 py-0.5 rounded-full bg-sage-100 text-sage-700 text-xs capitalize">{s.replace(/_/g, ' ')}</span>
                  ))}
                </div>
              </div>
            )}
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-sage-700">
              {contractor.has_vehicle && <span>✓ Has vehicle</span>}
              {contractor.provides_own_equipment && <span>✓ Own equipment</span>}
              {contractor.key_holding_approved && <span>✓ Key holding</span>}
              {contractor.alarm_access_approved && <span>✓ Alarm access</span>}
              {contractor.pet_friendly && <span>✓ Pet-friendly</span>}
            </div>
            {contractor.availability_notes && (
              <div className="mt-3 text-sm">
                <span className="text-sage-500">Availability</span>
                <p className="text-sage-700 whitespace-pre-wrap">{contractor.availability_notes}</p>
              </div>
            )}
          </Section>
        )}

        {/* Capability — shared (Phase 2) */}
        {(contractor.experience_level || contractor.can_lead_jobs || contractor.can_work_solo || contractor.can_supervise_others) && (
          <Section title="Capability">
            {contractor.experience_level && (
              <div className="text-sm mb-2">
                <span className="text-sage-500">Experience level</span>
                <p className="text-sage-800 font-medium capitalize">{contractor.experience_level}</p>
              </div>
            )}
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-sage-700">
              {contractor.can_lead_jobs && <span>✓ Can lead jobs</span>}
              {contractor.can_work_solo && <span>✓ Can work solo</span>}
              {contractor.can_supervise_others && <span>✓ Can supervise others</span>}
            </div>
          </Section>
        )}

        {/* Portal access — shared (Phase 2) */}
        <Section title="Portal access">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
            <div>
              <span className="text-sage-500">Portal access</span>
              <p className={clsx('font-medium', contractor.portal_access_active ? 'text-emerald-700' : 'text-sage-500')}>
                {contractor.portal_access_active ? 'Active' : 'Inactive'}
              </p>
            </div>
            <div>
              <span className="text-sage-500">Invite sent</span>
              <p className="text-sage-800 font-medium">{contractor.invite_sent_at ? fmtDate((contractor.invite_sent_at as string).slice(0, 10)) : '—'}</p>
            </div>
            <div>
              <span className="text-sage-500">Auth linked</span>
              <p className={clsx('font-medium', contractor.auth_user_id ? 'text-emerald-700' : 'text-sage-500')}>
                {contractor.auth_user_id ? 'Yes' : 'No'}
              </p>
            </div>
          </div>
        </Section>

        {/* Documents */}
        <Section title={`Documents${docs.length > 0 ? ` (${docs.length})` : ''}`}>
          <div className="mb-4">
            <DocumentUpload contractorId={contractor.id} />
          </div>
          <DocumentList documents={docs} contractorId={contractor.id} downloadUrls={downloadUrls} />
        </Section>

        {/* Training compliance */}
        <Section title={`Training${(trainingAssignments ?? []).length > 0 ? ` (${(trainingAssignments ?? []).filter((t) => t.status === 'completed').length}/${(trainingAssignments ?? []).length} completed)` : ''}`}>
          {(!trainingAssignments || trainingAssignments.length === 0) ? (
            <p className="text-sage-500 text-sm">No training assigned.</p>
          ) : (
            <div className="space-y-2">
              {(trainingAssignments ?? []).map((t) => {
                const mod = t.training_modules as unknown as { title: string; category: string } | null
                const today = new Date().toISOString().slice(0, 10)
                const isOverdue = t.status !== 'completed' && t.due_date && t.due_date < today
                return (
                  <div key={t.id} className="flex items-center justify-between bg-sage-50 rounded-lg px-4 py-3 text-sm">
                    <div>
                      <span className="font-medium text-sage-800">{mod?.title ?? '—'}</span>
                      <span className={clsx('inline-block px-2 py-0.5 rounded-full text-[10px] font-medium capitalize ml-2',
                        t.status === 'completed' ? 'bg-emerald-50 text-emerald-700' :
                        isOverdue ? 'bg-red-50 text-red-700' :
                        'bg-blue-50 text-blue-700'
                      )}>{isOverdue ? 'overdue' : t.status.replace('_', ' ')}</span>
                    </div>
                    {t.due_date && <span className="text-xs text-sage-500">Due {fmtDate(t.due_date)}</span>}
                  </div>
                )
              })}
            </div>
          )}
        </Section>

        {/* Incidents — Phase 2 */}
        <Section title={`Incidents${incidentList.length > 0 ? ` (${incidentList.length}${openIncidentCount > 0 ? `, ${openIncidentCount} open` : ''})` : ''}`}>
          <IncidentList contractorId={contractor.id} incidents={incidentList} />
        </Section>

        {/* Recent jobs */}
        <Section title={`Jobs${jobCount != null ? ` (${jobCount})` : ''}`}>
          {(!jobs || jobs.length === 0) ? (
            <p className="text-sage-500 text-sm">No jobs assigned yet.</p>
          ) : (
            <div className="space-y-2">
              {jobs.map((j) => (
                <Link
                  key={j.id}
                  href={`/portal/jobs/${j.id}`}
                  className="flex items-center justify-between bg-sage-50 rounded-lg px-4 py-3 hover:bg-sage-100 transition-colors text-sm"
                >
                  <div>
                    <span className="font-medium text-sage-800">{j.job_number}</span>
                    {j.title && <span className="text-sage-600 ml-2">{j.title}</span>}
                  </div>
                  <div className="flex items-center gap-3 text-xs">
                    <span className="text-sage-500">{fmtDate(j.scheduled_date)}</span>
                    <span className={clsx('inline-block px-2 py-0.5 rounded-full font-medium capitalize',
                      j.status === 'completed' ? 'bg-emerald-50 text-emerald-700' :
                      j.status === 'in_progress' ? 'bg-amber-50 text-amber-700' :
                      j.status === 'assigned' ? 'bg-blue-50 text-blue-700' :
                      'bg-gray-100 text-gray-600'
                    )}>{j.status.replace('_', ' ')}</span>
                  </div>
                </Link>
              ))}
              {(jobCount ?? 0) > 5 && (
                <p className="text-xs text-sage-500 pt-1">Showing 5 of {jobCount}</p>
              )}
            </div>
          )}
        </Section>

        <div className="text-xs text-sage-400 pt-4 border-t border-sage-100">
          Added {fmtDate(contractor.created_at)}
        </div>
      </div>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 className="text-lg font-semibold text-sage-800 mb-3">{title}</h2>
      {children}
    </div>
  )
}
