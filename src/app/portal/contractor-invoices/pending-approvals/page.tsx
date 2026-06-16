// Stage B — Pending pay approvals worklist (admin-only).
//
// Completed/invoiced jobs with an assigned contractor, waiting for their
// contractor pay to be approved. Staff approve row-by-row; every approval
// goes through the Stage A approveContractorPay action (the only path),
// which creates the approved contractor_invoice that flows into the
// remittance batch builder. No bulk approve, no paid, no remittance, no
// email.

import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { createClient } from '@/lib/supabase-server'
import { isAdminUser } from '@/lib/is-admin'
import { getWorkerPayableHours } from '@/lib/job-cost'
import { classifyApprovalRow } from '@/lib/pending-approvals'
import { PendingApprovalsList, type ApprovalRow } from './_components/PendingApprovalsList'

export const dynamic = 'force-dynamic'

interface JWRow {
  contractor_id: string
  job_id: string
  pay_rate: number | null
  pay_type: string | null
  hours_allocated: number | null
  actual_hours: number | null
  extra_hours: number | null
  extra_hours_status: string | null
  contractors: { full_name: string | null; hourly_rate: number | null } | null
  jobs: {
    id: string
    job_number: string | null
    address: string | null
    status: string | null
    completed_at: string | null
    allowed_hours: number | null
    description: string | null
    deleted_at: string | null
  } | null
}

export default async function PendingApprovalsPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!isAdminUser(user)) notFound()

  const { data: jwRaw } = await supabase
    .from('job_workers')
    .select(`
      contractor_id, job_id, pay_rate, pay_type, hours_allocated, actual_hours, extra_hours, extra_hours_status,
      contractors ( full_name, hourly_rate ),
      jobs ( id, job_number, address, status, completed_at, allowed_hours, description, deleted_at )
    `)

  const all = (jwRaw ?? []) as unknown as JWRow[]
  const live = all.filter((r) => r.jobs && !r.jobs.deleted_at && (r.jobs.status === 'completed' || r.jobs.status === 'invoiced'))

  const workersPerJob = new Map<string, number>()
  for (const r of live) workersPerJob.set(r.job_id, (workersPerJob.get(r.job_id) ?? 0) + 1)

  // Existing payables for these jobs → flag/exclude already-approved rows.
  const jobIds = Array.from(new Set(live.map((r) => r.job_id)))
  const { data: ciRaw } = jobIds.length > 0
    ? await supabase.from('contractor_invoices').select('id, invoice_number, status, job_id, contractor_id').in('job_id', jobIds)
    : { data: [] as unknown[] }
  const ciByKey = new Map<string, { id: string; invoice_number: string | null; status: string | null }>()
  for (const ci of (ciRaw ?? []) as Array<{ id: string; invoice_number: string | null; status: string | null; job_id: string; contractor_id: string }>) {
    if (ci.job_id && ci.contractor_id) ciByKey.set(`${ci.job_id}::${ci.contractor_id}`, { id: ci.id, invoice_number: ci.invoice_number, status: ci.status })
  }

  const rows: ApprovalRow[] = live.map((r) => {
    const job = r.jobs!
    const rate = r.pay_rate ?? r.contractors?.hourly_rate ?? null
    const allowedHours = r.hours_allocated ?? job.allowed_hours ?? null
    const payableHours = getWorkerPayableHours({
      pay_rate: r.pay_rate,
      approved_hours: null,
      actual_hours: null,
      hours_allocated: r.hours_allocated,
      extra_hours: r.extra_hours,
      extra_hours_status: r.extra_hours_status,
    })
    const existingCI = ciByKey.get(`${r.job_id}::${r.contractor_id}`) ?? null
    const computed = classifyApprovalRow({
      payType: r.pay_type,
      rate,
      allowedHours,
      submittedHours: r.actual_hours,
      payableHours,
      hasExistingCI: !!existingCI,
      workersOnJob: workersPerJob.get(r.job_id) ?? 1,
    })
    return {
      jobId: r.job_id,
      contractorId: r.contractor_id,
      jobNumber: job.job_number ?? '—',
      jobAddress: job.address ?? null,
      completedAt: job.completed_at ?? null,
      jobStatus: job.status ?? null,
      contractorName: r.contractors?.full_name ?? 'Unknown',
      note: job.description?.trim() || null,
      allowedHours,
      submittedHours: r.actual_hours,
      defaultApprovedHours: payableHours,
      rate,
      mode: computed.mode,
      computedAmount: computed.computedAmount,
      flags: computed.flags,
      readiness: computed.readiness,
      existingCI,
    }
  })
  // Stable sort: action-needed first (not already approved), newest completion first.
  rows.sort((a, b) => {
    const aDone = a.readiness === 'already_approved' ? 1 : 0
    const bDone = b.readiness === 'already_approved' ? 1 : 0
    if (aDone !== bDone) return aDone - bDone
    return (b.completedAt ?? '').localeCompare(a.completedAt ?? '')
  })

  const contractors = Array.from(new Map(rows.map((r) => [r.contractorId, r.contractorName])).entries())
    .map(([id, name]) => ({ id, name }))
    .sort((a, b) => a.name.localeCompare(b.name))

  return (
    <div className="max-w-6xl mx-auto">
      <Link href="/portal/contractor-invoices" className="inline-flex items-center gap-1.5 text-sm text-sage-600 hover:text-sage-800 mb-4">
        <ArrowLeft size={14} /> Back to contractor invoices
      </Link>
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-sage-800 tracking-tight">Pending pay approvals</h1>
        <p className="text-sm text-sage-500 mt-1 max-w-3xl">
          Completed jobs waiting for contractor pay approval. Approving creates an approved contractor invoice that you
          can then bundle into a remittance. Nothing is paid or emailed here.
        </p>
      </div>
      <PendingApprovalsList rows={rows} contractors={contractors} />
    </div>
  )
}
