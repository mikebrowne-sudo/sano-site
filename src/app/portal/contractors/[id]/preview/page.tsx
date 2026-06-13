// Staff "Preview as contractor" — a read-only desktop view of exactly
// what a given contractor sees in their mobile portal, rendered inside
// a phone frame with a tab bar.
//
// Read-only + staff-only. Data is loaded per-contractor via the
// service-role client (staff already see all contractor data in the
// portal) and rendered through the SAME shared view components the live
// contractor app uses, so the preview can never drift from the real
// thing. Every contractor action is disabled in this mode.

import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Briefcase, FileText, Wallet, BookOpen, User } from 'lucide-react'
import clsx from 'clsx'
import { createClient } from '@/lib/supabase-server'
import { getServiceSupabase } from '@/lib/supabase-service'
import { ContractorJobsView, type ContractorJobRow } from '@/app/contractor/_views/ContractorJobsView'
import { ContractorJobDetailView } from '@/app/contractor/_views/ContractorJobDetailView'
import { ContractorPayView } from '@/app/contractor/_views/ContractorPayView'
import { ContractorTrainingView } from '@/app/contractor/_views/ContractorTrainingView'
import { ContractorProfileView } from '@/app/contractor/_views/ContractorProfileView'
import { loadContractorPayStatement } from '@/app/contractor/_lib/contractor-pay-data'
import { loadContractorTraining } from '@/app/contractor/_lib/contractor-training-data'
import { loadContractorJobDetail } from '@/app/contractor/_lib/contractor-job-detail-data'

export const dynamic = 'force-dynamic'

type Tab = 'jobs' | 'job' | 'pay' | 'training' | 'profile'
const TABS: { key: Tab; label: string; Icon: typeof Briefcase }[] = [
  { key: 'jobs', label: 'Jobs', Icon: Briefcase },
  { key: 'job', label: 'Job', Icon: FileText },
  { key: 'pay', label: 'Pay', Icon: Wallet },
  { key: 'training', label: 'Training', Icon: BookOpen },
  { key: 'profile', label: 'Profile', Icon: User },
]

export default async function ContractorPreviewPage({
  params,
  searchParams,
}: {
  params: { id: string }
  searchParams?: { tab?: string; job?: string }
}) {
  // Staff gate — the portal is staff-only; require a session.
  const { data: { user } } = await createClient().auth.getUser()
  if (!user) notFound()

  const svc = getServiceSupabase()
  const { data: contractor } = await svc
    .from('contractors')
    .select('id, full_name, email, phone, worker_type, hourly_rate')
    .eq('id', params.id)
    .maybeSingle()
  if (!contractor) notFound()

  const fallbackRate = (contractor.hourly_rate as number | null) ?? 0
  const base = `/portal/contractors/${params.id}/preview`
  const tab = (TABS.find((t) => t.key === searchParams?.tab)?.key ?? 'jobs') as Tab

  // Jobs list is always loaded — it backs the Jobs tab and the default
  // selection for the Job tab.
  const { data: jobsRaw } = await svc
    .from('jobs')
    .select('id, job_number, title, address, scheduled_date, scheduled_time, duration_estimate, status')
    .eq('contractor_id', params.id)
    .is('deleted_at', null)
    .order('scheduled_date', { ascending: true, nullsFirst: false })
  const jobs = (jobsRaw ?? []) as ContractorJobRow[]

  // Render the active screen.
  let screen: React.ReactNode
  if (tab === 'jobs') {
    screen = <ContractorJobsView jobs={jobs} jobHref={(jid) => `${base}?tab=job&job=${jid}`} />
  } else if (tab === 'job') {
    const selectedId = searchParams?.job ?? jobs[0]?.id ?? null
    const detail = selectedId ? await loadContractorJobDetail(svc, params.id, selectedId, fallbackRate) : null
    screen = detail
      ? <ContractorJobDetailView job={detail} readOnly backHref={`${base}?tab=jobs`} />
      : <EmptyScreen label="No job to show. Pick one from the Jobs tab." />
  } else if (tab === 'pay') {
    const data = await loadContractorPayStatement(svc, params.id, fallbackRate)
    screen = <ContractorPayView data={data} />
  } else if (tab === 'training') {
    const items = await loadContractorTraining(svc, params.id)
    screen = <ContractorTrainingView items={items} />
  } else {
    screen = (
      <ContractorProfileView
        readOnly
        contractor={{
          full_name: contractor.full_name as string,
          email: (contractor.email as string | null) ?? null,
          phone: (contractor.phone as string | null) ?? null,
          worker_type: (contractor.worker_type as string | null) ?? null,
        }}
      />
    )
  }

  return (
    <div className="max-w-5xl mx-auto">
      <Link href={`/portal/contractors/${params.id}`} className="inline-flex items-center gap-1.5 text-sm text-sage-500 hover:text-sage-700 mb-4">
        <ArrowLeft size={14} /> Back to {contractor.full_name as string}
      </Link>

      <div className="mb-6">
        <h1 className="text-2xl font-bold text-sage-800 tracking-tight">Preview — {contractor.full_name as string}</h1>
        <p className="text-sage-500 text-sm mt-0.5">
          Read-only view of exactly what this contractor sees in their portal. Actions are disabled.
        </p>
      </div>

      {/* Phone frame */}
      <div className="flex justify-center">
        <div className="w-[400px] max-w-full">
          <div className="rounded-[2.25rem] border-[10px] border-sage-900 bg-sage-900 shadow-xl overflow-hidden">
            {/* status bar / notch */}
            <div className="h-6 bg-sage-900 flex items-center justify-center">
              <div className="w-24 h-1.5 rounded-full bg-sage-700" />
            </div>
            {/* screen */}
            <div className="bg-sage-50/60 h-[680px] overflow-y-auto">
              <div className="px-4 py-5">{screen}</div>
            </div>
            {/* bottom nav = tab bar */}
            <nav className="bg-white border-t border-sage-100 flex">
              {TABS.map(({ key, label, Icon }) => {
                const href = key === 'job' && searchParams?.job
                  ? `${base}?tab=job&job=${searchParams.job}`
                  : `${base}?tab=${key}`
                const active = key === tab
                return (
                  <Link
                    key={key}
                    href={href}
                    className={clsx(
                      'flex-1 flex flex-col items-center justify-center gap-0.5 py-2 text-[10px] font-medium transition-colors',
                      active ? 'text-sage-800' : 'text-sage-400 hover:text-sage-600',
                    )}
                  >
                    <Icon size={18} strokeWidth={active ? 2.4 : 1.8} />
                    {label}
                  </Link>
                )
              })}
            </nav>
          </div>
        </div>
      </div>
    </div>
  )
}

function EmptyScreen({ label }: { label: string }) {
  return (
    <div className="bg-white rounded-2xl border border-sage-100 p-10 text-center mt-6">
      <p className="text-sage-500 text-sm">{label}</p>
    </div>
  )
}
