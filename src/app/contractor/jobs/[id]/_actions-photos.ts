'use server'

// Contractor job photos — upload + delete (proof of completion).
//
// Ownership is enforced here (the contractor must own the job / the
// photo); storage + DB writes go through the service-role client so we
// don't depend on storage RLS. The bucket is private — images are only
// ever served via short-lived signed URLs (see src/lib/job-photos.ts).

import { createClient } from '@/lib/supabase-server'
import { getServiceSupabase } from '@/lib/supabase-service'
import { JOB_PHOTOS_BUCKET } from '@/lib/job-photos'
import { revalidatePath } from 'next/cache'

const MAX_BYTES = 10 * 1024 * 1024 // 10 MB
const MAX_PER_UPLOAD = 12

async function resolveOwner(jobId: string): Promise<{ contractorId: string } | { error: string }> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated.' }

  const { data: contractor } = await supabase
    .from('contractors')
    .select('id')
    .eq('auth_user_id', user.id)
    .maybeSingle()
  if (!contractor) return { error: 'Not authenticated.' }

  const { data: job } = await supabase
    .from('jobs')
    .select('id')
    .eq('id', jobId)
    .eq('contractor_id', contractor.id)
    .maybeSingle()
  if (!job) return { error: 'You do not have access to this job.' }

  return { contractorId: contractor.id as string }
}

function safeExt(name: string): string {
  const ext = (name.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '')
  return ext || 'jpg'
}

export async function uploadJobPhotos(jobId: string, formData: FormData) {
  const owner = await resolveOwner(jobId)
  if ('error' in owner) return owner

  const files = formData.getAll('files').filter((f): f is File => f instanceof File && f.size > 0)
  if (files.length === 0) return { error: 'No photo selected.' }
  if (files.length > MAX_PER_UPLOAD) return { error: `You can upload up to ${MAX_PER_UPLOAD} photos at once.` }

  for (const f of files) {
    if (!f.type.startsWith('image/')) return { error: 'Only image files can be uploaded.' }
    if (f.size > MAX_BYTES) return { error: 'Each photo must be under 10 MB.' }
  }

  const svc = getServiceSupabase()
  const uploadedPaths: string[] = []

  for (const file of files) {
    const path = `${jobId}/${owner.contractorId}/${crypto.randomUUID()}.${safeExt(file.name)}`
    const { error: upErr } = await svc.storage
      .from(JOB_PHOTOS_BUCKET)
      .upload(path, file, { contentType: file.type, upsert: false })
    if (upErr) {
      // Roll back anything already uploaded so we don't orphan objects.
      if (uploadedPaths.length) await svc.storage.from(JOB_PHOTOS_BUCKET).remove(uploadedPaths)
      return { error: `Upload failed: ${upErr.message}` }
    }
    uploadedPaths.push(path)
  }

  const { error: dbErr } = await svc.from('job_photos').insert(
    uploadedPaths.map((file_path) => ({
      job_id: jobId,
      contractor_id: owner.contractorId,
      file_path,
    })),
  )
  if (dbErr) {
    await svc.storage.from(JOB_PHOTOS_BUCKET).remove(uploadedPaths)
    return { error: `Failed to save photos: ${dbErr.message}` }
  }

  revalidatePath(`/contractor/jobs/${jobId}`)
  revalidatePath(`/portal/jobs/${jobId}`)
  return { ok: true, count: uploadedPaths.length }
}

export async function deleteJobPhoto(photoId: string, jobId: string) {
  const owner = await resolveOwner(jobId)
  if ('error' in owner) return owner

  const svc = getServiceSupabase()
  const { data: photo } = await svc
    .from('job_photos')
    .select('id, job_id, contractor_id, file_path')
    .eq('id', photoId)
    .maybeSingle()

  if (!photo || photo.job_id !== jobId || photo.contractor_id !== owner.contractorId) {
    return { error: 'Photo not found.' }
  }

  await svc.storage.from(JOB_PHOTOS_BUCKET).remove([photo.file_path as string])
  const { error: delErr } = await svc.from('job_photos').delete().eq('id', photoId)
  if (delErr) return { error: `Failed to delete photo: ${delErr.message}` }

  revalidatePath(`/contractor/jobs/${jobId}`)
  revalidatePath(`/portal/jobs/${jobId}`)
  return { ok: true }
}
