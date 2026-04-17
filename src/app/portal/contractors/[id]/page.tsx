import { createClient } from '@/lib/supabase-server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Pencil } from 'lucide-react'
import { DocumentUpload } from '../_components/DocumentUpload'
import { DocumentList } from '../_components/DocumentList'
import { PayPreview } from '../_components/PayPreview'
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

  const [{ data: contractor, error }, { data: jobs, count: jobCount }, { data: documents }, { data: trainingAssignments }] = await Promise.all([
    supabase
      .from('contractors')
      .select('id, full_name, email, phone, hourly_rate, base_hourly_rate, loaded_hourly_rate, holiday_pay_percent, status, worker_type, notes, created_at, start_date, end_date, pay_frequency, standard_hours, holiday_pay_method, ird_number, tax_code, ir330_received, kiwisaver_enrolled, kiwisaver_employee_rate, kiwisaver_employer_rate')
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
          <div className="flex items-center gap-2 mt-1">
            <span className={clsx('inline-block px-2.5 py-0.5 rounded-full text-xs font-medium capitalize', contractor.status === 'active' ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-600')}>
              {contractor.status}
            </span>
            <span className={clsx('inline-block px-2.5 py-0.5 rounded-full text-xs font-medium capitalize', WORKER_TYPE_STYLES[workerType] ?? WORKER_TYPE_STYLES.contractor)}>
              {workerType.replace('_', ' ')}
            </span>
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
