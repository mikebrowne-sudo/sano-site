// Contractor job-detail data loader — shared by the live job page and
// the staff preview. Computes the contractor's pay for the job on the
// canonical basis and pulls their proof-of-completion photos.

import type { SupabaseClient } from '@supabase/supabase-js'
import { getWorkerPayableHours, getWorkerLabourCost, getWorkerRate } from '@/lib/job-cost'
import { getJobPhotos } from '@/lib/job-photos'

export interface ContractorJobDetail {
  id: string
  job_number: string
  title: string | null
  description: string | null
  address: string | null
  scheduled_date: string | null
  scheduled_time: string | null
  duration_estimate: string | null
  allowed_hours: number | null
  access_instructions: string | null
  status: string
  contractor_notes: string | null
  started_at: string | null
  completed_at: string | null
  payableHours: number | null
  jobPay: number
  payRate: number | null
  approvedExtra: number
  photos: { id: string; url: string | null; createdAt: string }[]
}

export async function loadContractorJobDetail(
  supabase: SupabaseClient,
  contractorId: string,
  jobId: string,
  fallbackRate: number,
): Promise<ContractorJobDetail | null> {
  const [{ data: job }, { data: worker }, photos] = await Promise.all([
    supabase
      .from('jobs')
      .select(`
        id, job_number, title, description, address,
        scheduled_date, scheduled_time, duration_estimate,
        allowed_hours, access_instructions,
        status, contractor_notes, started_at, completed_at
      `)
      .eq('id', jobId)
      .eq('contractor_id', contractorId)
      .maybeSingle(),
    supabase
      .from('job_workers')
      .select('hours_allocated, pay_rate, extra_hours, extra_hours_status')
      .eq('job_id', jobId)
      .eq('contractor_id', contractorId)
      .maybeSingle(),
    getJobPhotos(jobId),
  ])

  if (!job) return null

  const costInput = {
    pay_rate: (worker?.pay_rate as number | null) ?? null,
    contractor_hourly_rate: fallbackRate,
    approved_hours: null,
    actual_hours: null,
    hours_allocated: (worker?.hours_allocated as number | null) ?? (job.allowed_hours as number | null) ?? null,
    extra_hours: (worker?.extra_hours as number | null) ?? 0,
    extra_hours_status: (worker?.extra_hours_status as string | null) ?? 'none',
  }

  return {
    id: job.id as string,
    job_number: job.job_number as string,
    title: (job.title as string | null) ?? null,
    description: (job.description as string | null) ?? null,
    address: (job.address as string | null) ?? null,
    scheduled_date: (job.scheduled_date as string | null) ?? null,
    scheduled_time: (job.scheduled_time as string | null) ?? null,
    duration_estimate: (job.duration_estimate as string | null) ?? null,
    allowed_hours: (job.allowed_hours as number | null) ?? null,
    access_instructions: (job.access_instructions as string | null) ?? null,
    status: (job.status as string) ?? 'draft',
    contractor_notes: (job.contractor_notes as string | null) ?? null,
    started_at: (job.started_at as string | null) ?? null,
    completed_at: (job.completed_at as string | null) ?? null,
    payableHours: getWorkerPayableHours(costInput),
    jobPay: getWorkerLabourCost(costInput),
    payRate: getWorkerRate(costInput, fallbackRate),
    approvedExtra: costInput.extra_hours_status === 'approved' ? (costInput.extra_hours ?? 0) : 0,
    photos: photos.map((p) => ({ id: p.id, url: p.url, createdAt: p.createdAt })),
  }
}
