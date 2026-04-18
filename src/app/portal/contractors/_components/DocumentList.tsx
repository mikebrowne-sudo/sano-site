'use client'

import { useState, useTransition } from 'react'
import { deleteDocument } from '../_actions'
import { FileText, Trash2, Download } from 'lucide-react'
import clsx from 'clsx'

const TYPE_LABELS: Record<string, string> = {
  contract: 'Contract',
  insurance: 'Insurance',
  right_to_work: 'Right to Work',
  health_and_safety: 'Health & Safety',
  onboarding: 'Onboarding',
  policy: 'Policy',
  id_verification: 'ID / Verification',
  other: 'Other',
}

const TYPE_COLORS: Record<string, string> = {
  contract: 'bg-blue-50 text-blue-700',
  insurance: 'bg-rose-50 text-rose-700',
  right_to_work: 'bg-indigo-50 text-indigo-700',
  health_and_safety: 'bg-amber-50 text-amber-700',
  onboarding: 'bg-emerald-50 text-emerald-700',
  policy: 'bg-purple-50 text-purple-700',
  id_verification: 'bg-sage-100 text-sage-700',
  other: 'bg-gray-100 text-gray-600',
}

interface Document {
  id: string
  document_type: string
  title: string
  file_path: string
  file_size: number | null
  notes: string | null
  uploaded_at: string
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-NZ', { day: 'numeric', month: 'short', year: 'numeric' })
}

function fmtSize(bytes: number | null) {
  if (bytes == null) return ''
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function DocumentList({ documents, contractorId, downloadUrls }: { documents: Document[]; contractorId: string; downloadUrls: Record<string, string> }) {
  if (documents.length === 0) {
    return <p className="text-sage-500 text-sm">No documents uploaded yet.</p>
  }

  return (
    <div className="space-y-2">
      {documents.map((doc) => (
        <DocumentRow key={doc.id} doc={doc} contractorId={contractorId} downloadUrl={downloadUrls[doc.id]} />
      ))}
    </div>
  )
}

function DocumentRow({ doc, contractorId, downloadUrl }: { doc: Document; contractorId: string; downloadUrl?: string }) {
  const [confirming, setConfirming] = useState(false)
  const [isPending, startTransition] = useTransition()

  function handleDelete() {
    startTransition(async () => {
      await deleteDocument(doc.id, contractorId)
    })
  }

  return (
    <div className="flex items-start gap-3 bg-sage-50 rounded-lg px-4 py-3">
      <FileText size={18} className="text-sage-400 mt-0.5 shrink-0" />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <span className="font-medium text-sage-800 text-sm truncate">{doc.title}</span>
          <span className={clsx('inline-block px-2 py-0.5 rounded-full text-[10px] font-medium', TYPE_COLORS[doc.document_type] ?? TYPE_COLORS.other)}>
            {TYPE_LABELS[doc.document_type] ?? doc.document_type}
          </span>
        </div>
        <div className="flex items-center gap-3 text-xs text-sage-500">
          <span>{fmtDate(doc.uploaded_at)}</span>
          {doc.file_size && <span>{fmtSize(doc.file_size)}</span>}
          {doc.notes && <span className="truncate">{doc.notes}</span>}
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {downloadUrl && (
          <a href={downloadUrl} target="_blank" rel="noopener noreferrer" className="p-1.5 text-sage-400 hover:text-sage-700 transition-colors" title="Download">
            <Download size={14} />
          </a>
        )}
        {!confirming ? (
          <button onClick={() => setConfirming(true)} className="p-1.5 text-sage-400 hover:text-red-500 transition-colors" title="Delete">
            <Trash2 size={14} />
          </button>
        ) : (
          <div className="flex items-center gap-1">
            <button onClick={handleDelete} disabled={isPending} className="text-xs text-red-600 font-medium hover:text-red-700">
              {isPending ? '…' : 'Delete'}
            </button>
            <button onClick={() => setConfirming(false)} className="text-xs text-sage-500">Cancel</button>
          </div>
        )}
      </div>
    </div>
  )
}
