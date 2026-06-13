// Job photos — read helper (server-only).
//
// Contractors upload proof-of-completion photos to the private
// `job-photos` bucket; staff view them on the portal job page. All
// object access is brokered by the service-role client (ownership is
// enforced in the upload/delete actions), so this helper returns
// short-lived signed URLs the page can render directly.

import { getServiceSupabase } from './supabase-service'

export const JOB_PHOTOS_BUCKET = 'job-photos'
const SIGNED_URL_TTL = 60 * 60 // 1 hour — long enough for a page session.

export interface JobPhoto {
  id: string
  jobId: string
  contractorId: string | null
  caption: string | null
  createdAt: string
  /** Signed URL for the image, or null if signing failed. */
  url: string | null
}

/**
 * All photos for a job, oldest first, each with a signed URL.
 * Caller is responsible for authorising the viewer (staff, or the
 * owning contractor) before calling — this uses service-role and does
 * not itself check identity.
 */
export async function getJobPhotos(jobId: string): Promise<JobPhoto[]> {
  const svc = getServiceSupabase()

  const { data: rows, error } = await svc
    .from('job_photos')
    .select('id, job_id, contractor_id, file_path, caption, created_at')
    .eq('job_id', jobId)
    .order('created_at', { ascending: true })

  if (error || !rows || rows.length === 0) return []

  const paths = rows.map((r) => r.file_path as string)
  const { data: signed } = await svc.storage
    .from(JOB_PHOTOS_BUCKET)
    .createSignedUrls(paths, SIGNED_URL_TTL)

  const urlByPath = new Map<string, string>()
  for (const s of signed ?? []) {
    if (s.path && s.signedUrl) urlByPath.set(s.path, s.signedUrl)
  }

  return rows.map((r) => ({
    id: r.id as string,
    jobId: r.job_id as string,
    contractorId: (r.contractor_id as string | null) ?? null,
    caption: (r.caption as string | null) ?? null,
    createdAt: r.created_at as string,
    url: urlByPath.get(r.file_path as string) ?? null,
  }))
}
