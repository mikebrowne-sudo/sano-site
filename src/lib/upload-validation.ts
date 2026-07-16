// Shared validation for contractor-facing document uploads (Phase 3).
// PDF / JPG / PNG only, up to 10 MB. Accepts a match on EITHER the file
// extension or the MIME type, since some browsers send an empty/generic
// content-type for a valid file.

export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024 // 10 MB

const ALLOWED_EXT = ['pdf', 'jpg', 'jpeg', 'png']
const ALLOWED_MIME = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png']

export function validateUploadFile(
  input: { name?: string | null; type?: string | null; size?: number | null },
): { ok: true } | { ok: false; error: string } {
  const size = input.size ?? 0
  if (size <= 0) return { ok: false, error: 'That file looks empty — please choose another.' }
  if (size > MAX_UPLOAD_BYTES) return { ok: false, error: 'File is too large — the maximum is 10 MB.' }

  const ext = (input.name?.split('.').pop() || '').toLowerCase()
  const mime = (input.type || '').toLowerCase()
  const okExt = ALLOWED_EXT.includes(ext)
  const okMime = mime ? ALLOWED_MIME.includes(mime) : false
  if (!okExt && !okMime) return { ok: false, error: 'Please upload a PDF, JPG or PNG file.' }

  return { ok: true }
}
