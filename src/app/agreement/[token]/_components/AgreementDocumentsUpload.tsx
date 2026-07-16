'use client'

// Contractor-facing document upload for the sign flow (Phase 3). One slot per
// document type; a file uploads immediately on selection (token-keyed service
// action) and can be removed until the agreement is signed. No staff document
// controls are exposed — a contractor only manages their own uploads.

import { useState } from 'react'
import { Loader2, Check, X, Upload } from 'lucide-react'
import { uploadAgreementDocument, deleteAgreementDocument } from '../_actions'
import { agreementDocTypesForStructure } from '@/lib/agreement-documents'

export interface UploadedDoc {
  id: string
  documentType: string
  title: string
  fileName: string
}

export function AgreementDocumentsUpload({
  token,
  initialDocs,
  structure,
}: {
  token: string
  initialDocs: UploadedDoc[]
  structure?: string | null
}) {
  const [docs, setDocs] = useState<UploadedDoc[]>(initialDocs)
  const [busyType, setBusyType] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const docTypes = agreementDocTypesForStructure(structure)

  async function onPick(documentType: string, file: File) {
    setError(null)
    setBusyType(documentType)
    try {
      const fd = new FormData()
      fd.set('token', token)
      fd.set('documentType', documentType)
      fd.set('file', file)
      const res = await uploadAgreementDocument(fd)
      if ('error' in res) { setError(res.error); return }
      setDocs((prev) => [
        ...prev.filter((d) => d.documentType !== documentType),
        { id: res.id, documentType, title: res.title, fileName: res.fileName },
      ])
    } finally {
      setBusyType(null)
    }
  }

  async function onRemove(id: string) {
    setError(null)
    const res = await deleteAgreementDocument({ token, documentId: id })
    if ('error' in res) { setError(res.error); return }
    setDocs((prev) => prev.filter((d) => d.id !== id))
  }

  return (
    <div>
      <h2 className="text-base font-semibold text-sage-800 mb-1">Documents</h2>
      <p className="text-[11px] text-sage-400 mb-3">PDF, JPG or PNG · up to 10 MB each. You can add these now or your onboarding contact can help later.</p>
      <div className="space-y-2.5">
        {docTypes.map((dt) => {
          const existing = docs.find((d) => d.documentType === dt.value)
          const busy = busyType === dt.value
          return (
            <div key={dt.value} className="rounded-lg border border-sage-200 p-3">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-sage-800">{dt.label}</p>
                  {dt.hint && <p className="text-[11px] text-sage-400">{dt.hint}</p>}
                </div>
                {existing ? (
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="inline-flex items-center gap-1 text-xs text-emerald-700"><Check size={14} /> <span className="max-w-[9rem] truncate">{existing.fileName}</span></span>
                    <button type="button" onClick={() => onRemove(existing.id)} className="text-sage-400 hover:text-red-600" aria-label="Remove">
                      <X size={15} />
                    </button>
                  </div>
                ) : (
                  <label className="inline-flex items-center gap-1.5 text-xs font-medium text-sage-600 hover:text-sage-800 cursor-pointer shrink-0">
                    {busy ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
                    {busy ? 'Uploading…' : 'Upload'}
                    <input
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
                      className="hidden"
                      disabled={busy}
                      onChange={(e) => {
                        const file = e.target.files?.[0]
                        if (file) onPick(dt.value, file)
                        e.target.value = '' // allow re-picking the same file
                      }}
                    />
                  </label>
                )}
              </div>
            </div>
          )
        })}
      </div>
      {error && <p className="text-sm text-red-600 mt-2">{error}</p>}
    </div>
  )
}
