// Browser half of the direct-to-storage worker document upload (see
// worker-document-upload.ts). Sends the file bytes straight to Supabase
// Storage using the one-time token the server issued — the file never passes
// through a Next.js server action, so the 1 MB action / ~6 MB Netlify limits
// don't apply.

import { createClient } from './supabase-browser'

const WORKER_DOC_BUCKET = 'worker-documents'

/** Returns null on success, or a user-facing error message. */
export async function uploadWorkerDocToSignedUrl(path: string, uploadToken: string, file: File): Promise<string | null> {
  const { error } = await createClient()
    .storage.from(WORKER_DOC_BUCKET)
    .uploadToSignedUrl(path, uploadToken, file, { contentType: file.type || undefined })
  return error ? `Upload failed: ${error.message}` : null
}
