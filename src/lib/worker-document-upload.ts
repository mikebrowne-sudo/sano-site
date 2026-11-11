// Direct-to-storage uploads for worker documents (photo ID, insurance,
// right-to-work, etc.).
//
// Why: posting a file THROUGH a Next.js server action caps it at the server-
// action body limit (1 MB by default) and, on Netlify, the function request
// limit (~6 MB). Phone photos and multi-page insurance PDFs routinely exceed
// both, which surfaced to contractors as a generic upload error.
//
// Flow (two server calls, file bytes never touch our function):
//   1. prepare  — server validates the request + who is asking, picks the
//                 storage path, and returns a one-time signed upload token.
//   2. browser  — uploads the file straight to Supabase Storage with it.
//   3. finalise — server re-checks the path belongs to the caller, confirms
//                 the object exists and is within the size limit, then
//                 records the worker_documents row.

import type { SupabaseClient } from '@supabase/supabase-js'
import { MAX_UPLOAD_BYTES, validateUploadFile } from './upload-validation'

export const WORKER_DOC_BUCKET = 'worker-documents'

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/** Storage path for a new upload: `<prefix>/<documentType>-<timestamp>.<ext>`. */
export function buildWorkerDocPath(prefix: string, documentType: string, fileName: string, now: number = Date.now()): string {
  const ext = (fileName.split('.').pop() || '').toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 8) || 'bin'
  return `${prefix}/${documentType}-${now}.${ext}`
}

/**
 * True only for a path this caller could have been issued by
 * buildWorkerDocPath — same folder, same document type, no traversal. Stops a
 * finalise call from claiming someone else's object.
 */
export function isExpectedWorkerDocPath(path: string, prefix: string, documentType: string): boolean {
  const re = new RegExp(`^${escapeRegExp(prefix)}/${escapeRegExp(documentType)}-\\d{10,}\\.[a-z0-9]{1,8}$`)
  return re.test(path)
}

export interface PrepareUploadInput {
  fileName: string
  fileType?: string | null
  fileSize: number
}

/** Validate the file metadata and mint a signed upload token for `path`. */
export async function createWorkerDocUploadUrl(
  svc: SupabaseClient,
  path: string,
  file: PrepareUploadInput,
): Promise<{ ok: true; path: string; uploadToken: string } | { error: string }> {
  const valid = validateUploadFile({ name: file.fileName, type: file.fileType, size: file.fileSize })
  if (!valid.ok) return { error: valid.error }

  const { data, error } = await svc.storage.from(WORKER_DOC_BUCKET).createSignedUploadUrl(path)
  if (error || !data) return { error: `Couldn’t start the upload: ${error?.message ?? 'unknown error'}` }
  return { ok: true, path: data.path, uploadToken: data.token }
}

/**
 * Confirm the uploaded object exists and is within the size limit. Removes an
 * oversized object (the signed token can't cap size on its own).
 */
export async function confirmUploadedWorkerDoc(
  svc: SupabaseClient,
  path: string,
): Promise<{ ok: true; size: number } | { error: string }> {
  const slash = path.lastIndexOf('/')
  const dir = path.slice(0, slash)
  const name = path.slice(slash + 1)

  const { data, error } = await svc.storage.from(WORKER_DOC_BUCKET).list(dir, { search: name, limit: 20 })
  if (error) return { error: `Couldn’t confirm the upload: ${error.message}` }
  const obj = (data ?? []).find((o) => o.name === name)
  if (!obj) return { error: 'The upload didn’t arrive — please try again.' }

  const size = Number((obj.metadata as { size?: number } | null)?.size ?? 0)
  if (size > MAX_UPLOAD_BYTES) {
    await svc.storage.from(WORKER_DOC_BUCKET).remove([path])
    return { error: 'File is too large — the maximum is 10 MB.' }
  }
  return { ok: true, size }
}
