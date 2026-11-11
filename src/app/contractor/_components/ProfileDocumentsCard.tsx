'use client'

// Contractor Profile — documents (photo ID, insurance, right-to-work). The
// worker can upload or replace their own evidence; files go straight to
// storage (no server-action size limit). Read-only in the staff preview.

import { useState } from 'react'
import { FileText, Loader2, Check, Upload } from 'lucide-react'
import { prepareProfileUpload, finaliseProfileUpload } from '../profile/_actions'
import { uploadWorkerDocToSignedUrl } from '@/lib/worker-document-upload-client'

export interface ProfileDocSlotView {
  documentType: string
  label: string
  hint?: string
  required: boolean
  latest: { title: string; uploadedAt: string } | null
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-NZ', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Pacific/Auckland' })
}

export function ProfileDocumentsCard({
  initialSlots,
  readOnly = false,
}: {
  initialSlots: ProfileDocSlotView[]
  readOnly?: boolean
}) {
  const [slots, setSlots] = useState(initialSlots)
  const [busyType, setBusyType] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function onPick(documentType: string, file: File) {
    setError(null)
    setBusyType(documentType)
    try {
      const prep = await prepareProfileUpload({ documentType, fileName: file.name, fileType: file.type, fileSize: file.size })
      if ('error' in prep) { setError(prep.error); return }
      const upErr = await uploadWorkerDocToSignedUrl(prep.path, prep.uploadToken, file)
      if (upErr) { setError(upErr); return }
      const res = await finaliseProfileUpload({ documentType, path: prep.path, fileName: file.name })
      if ('error' in res) { setError(res.error); return }
      setSlots((prev) => prev.map((s) => (s.documentType === documentType ? { ...s, latest: { title: res.title, uploadedAt: res.uploadedAt } } : s)))
    } catch {
      setError('Upload failed — check your connection and try again.')
    } finally {
      setBusyType(null)
    }
  }

  return (
    <section className="bg-white rounded-2xl border border-sage-100 p-5">
      <h2 className="flex items-center gap-2 text-base font-semibold text-sage-800">
        <FileText size={16} className="text-sage-400" />
        Documents
      </h2>
      <p className="text-xs text-sage-500 mt-0.5 mb-4">PDF, JPG or PNG, up to 10 MB. A clear photo from your phone is fine.</p>

      <div className="space-y-2.5">
        {slots.map((s) => {
          const busy = busyType === s.documentType
          return (
            <div key={s.documentType} className="rounded-xl border border-sage-200 p-3.5">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-sage-800">{s.label}</p>
                  {s.latest ? (
                    <p className="flex items-center gap-1 text-xs text-emerald-700 mt-0.5">
                      <Check size={13} className="shrink-0" />
                      <span className="truncate">Sent {fmtDate(s.latest.uploadedAt)}</span>
                    </p>
                  ) : s.required ? (
                    <p className="text-xs text-amber-700 mt-0.5">Needed — not sent yet</p>
                  ) : (
                    s.hint && <p className="text-xs text-sage-400 mt-0.5">{s.hint}</p>
                  )}
                </div>
                {!readOnly && (
                  <label className="inline-flex items-center gap-1.5 text-sm font-medium text-sage-700 border border-sage-200 rounded-lg px-3 py-2 hover:bg-sage-50 cursor-pointer shrink-0">
                    {busy ? <Loader2 size={15} className="animate-spin" /> : <Upload size={15} />}
                    {busy ? 'Uploading…' : s.latest ? 'Replace' : 'Upload'}
                    <input
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
                      className="hidden"
                      disabled={busyType !== null}
                      onChange={(e) => {
                        const file = e.target.files?.[0]
                        if (file) onPick(s.documentType, file)
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

      {error && <p className="text-sm text-red-600 mt-3">{error}</p>}
    </section>
  )
}
