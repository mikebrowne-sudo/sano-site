'use client'

// Phase 5.5.10 — Archive / safe-delete / merge controls for the client
// detail page. Mirrors the access-panel pattern (44px tap targets,
// inline modals).

import { useState, useTransition } from 'react'
import {
  archiveClient,
  unarchiveClient,
  safeDeleteClient,
  mergeClients,
} from '../../_actions-cleanup'
import { Archive, ArchiveRestore, Trash2, Combine, X } from 'lucide-react'

interface MergeCandidate {
  id: string
  name: string
  company_name: string | null
}

interface LinkCounts {
  quotes: number
  jobs: number
  invoices: number
  contacts: number
  sites: number
}

export function ClientCleanupActions({
  clientId,
  clientName,
  isArchived,
  links,
  mergeCandidates,
}: {
  clientId: string
  clientName: string
  isArchived: boolean
  links: LinkCounts
  mergeCandidates: MergeCandidate[]
}) {
  const [pending, startTransition] = useTransition()
  const [errorMessage, setErrorMessage] = useState('')
  const [flash, setFlash] = useState<'idle' | 'archived' | 'unarchived' | 'merged'>('idle')
  const [modal, setModal] = useState<null | 'merge' | 'delete'>(null)
  const [mergeTargetId, setMergeTargetId] = useState('')
  const [mergeQ, setMergeQ] = useState('')

  const safeToDelete = links.quotes === 0 && links.jobs === 0 && links.invoices === 0

  function doArchive() {
    setErrorMessage('')
    startTransition(async () => {
      const r = await archiveClient(clientId)
      if ('error' in r) { setErrorMessage(r.error); return }
      setFlash('archived')
      setTimeout(() => setFlash('idle'), 2000)
    })
  }
  function doUnarchive() {
    setErrorMessage('')
    startTransition(async () => {
      const r = await unarchiveClient(clientId)
      if ('error' in r) { setErrorMessage(r.error); return }
      setFlash('unarchived')
      setTimeout(() => setFlash('idle'), 2000)
    })
  }
  function doDelete() {
    setErrorMessage('')
    startTransition(async () => {
      const r = await safeDeleteClient(clientId)
      if ('error' in r) { setErrorMessage(r.error); return }
      // On success the caller re-renders /portal/clients (the action
      // revalidates the path). Hard-redirect to be safe.
      window.location.href = '/portal/clients'
    })
  }
  function doMerge() {
    if (!mergeTargetId) return
    setErrorMessage('')
    startTransition(async () => {
      const r = await mergeClients({ sourceId: clientId, targetId: mergeTargetId })
      if ('error' in r) { setErrorMessage(r.error); return }
      setModal(null)
      setFlash('merged')
      // Send the user to the target client so they can review.
      setTimeout(() => { window.location.href = `/portal/clients/${mergeTargetId}` }, 700)
    })
  }

  const filteredCandidates = mergeCandidates
    .filter((c) => c.id !== clientId)
    .filter((c) => {
      if (!mergeQ.trim()) return true
      const needle = mergeQ.trim().toLowerCase()
      return c.name.toLowerCase().includes(needle) ||
             (c.company_name?.toLowerCase().includes(needle) ?? false)
    })
    .slice(0, 25)

  return (
    <div className="bg-white rounded-2xl border border-sage-100 shadow-sm p-6 mb-6">
      <h2 className="text-lg font-semibold text-sage-800 mb-1">Cleanup</h2>
      <p className="text-xs text-sage-500 mb-4">
        Archive hides this client from new selectors. Delete is only allowed when the client has no records. Merge moves every quote, job, invoice, contact, and site to a target client, then archives this one.
      </p>

      <div className="flex flex-wrap gap-2 mb-3">
        {!isArchived ? (
          <button
            type="button"
            onClick={doArchive}
            disabled={pending}
            className="inline-flex items-center gap-1.5 bg-white border border-sage-200 text-sage-700 font-semibold px-4 py-2.5 rounded-lg text-sm hover:bg-sage-50 transition-colors disabled:opacity-50 min-h-[44px]"
          >
            <Archive size={14} /> Archive client
          </button>
        ) : (
          <button
            type="button"
            onClick={doUnarchive}
            disabled={pending}
            className="inline-flex items-center gap-1.5 bg-emerald-500 text-white font-semibold px-4 py-2.5 rounded-lg text-sm hover:bg-emerald-600 transition-colors disabled:opacity-50 min-h-[44px]"
          >
            <ArchiveRestore size={14} /> Unarchive
          </button>
        )}

        <button
          type="button"
          onClick={() => { setMergeQ(''); setMergeTargetId(''); setErrorMessage(''); setModal('merge') }}
          disabled={pending}
          className="inline-flex items-center gap-1.5 bg-white border border-sage-200 text-sage-700 font-semibold px-4 py-2.5 rounded-lg text-sm hover:bg-sage-50 transition-colors disabled:opacity-50 min-h-[44px]"
        >
          <Combine size={14} /> Merge into another client…
        </button>

        {safeToDelete ? (
          <button
            type="button"
            onClick={() => { setErrorMessage(''); setModal('delete') }}
            disabled={pending}
            className="inline-flex items-center gap-1.5 bg-white border border-red-200 text-red-700 font-semibold px-4 py-2.5 rounded-lg text-sm hover:bg-red-50 transition-colors disabled:opacity-50 min-h-[44px]"
          >
            <Trash2 size={14} /> Delete (no records)
          </button>
        ) : (
          <span className="inline-flex items-center text-xs text-sage-500 px-2 py-2.5">
            Delete unavailable — {links.quotes} quote{links.quotes === 1 ? '' : 's'}, {links.jobs} job{links.jobs === 1 ? '' : 's'}, {links.invoices} invoice{links.invoices === 1 ? '' : 's'}. Archive instead.
          </span>
        )}
      </div>

      {flash === 'archived'   && <p className="text-xs text-emerald-700 mt-1">Client archived.</p>}
      {flash === 'unarchived' && <p className="text-xs text-emerald-700 mt-1">Client unarchived.</p>}
      {flash === 'merged'     && <p className="text-xs text-emerald-700 mt-1">Merged. Redirecting…</p>}
      {errorMessage           && <p className="text-xs text-red-600 mt-1">{errorMessage}</p>}

      {/* Merge modal */}
      {modal === 'merge' && (
        <Modal onClose={() => !pending && setModal(null)} title={`Merge ${clientName} into…`}>
          <p className="text-sm text-sage-600 mb-3">
            All {links.quotes + links.jobs + links.invoices} document{(links.quotes + links.jobs + links.invoices) === 1 ? '' : 's'} ({links.quotes} quote{links.quotes === 1 ? '' : 's'}, {links.jobs} job{links.jobs === 1 ? '' : 's'}, {links.invoices} invoice{links.invoices === 1 ? '' : 's'}) plus {links.contacts} contact{links.contacts === 1 ? '' : 's'} and {links.sites} site{links.sites === 1 ? '' : 's'} will move. <strong>{clientName}</strong> will be archived.
          </p>
          <input
            type="search"
            value={mergeQ}
            onChange={(e) => setMergeQ(e.target.value)}
            placeholder="Search target client by name or company…"
            className="w-full border border-sage-200 rounded-lg px-3 py-2 text-sm bg-white text-sage-800 mb-3 focus:outline-none focus:ring-2 focus:ring-sage-300"
            autoFocus
          />
          <div className="max-h-72 overflow-y-auto border border-sage-100 rounded-lg divide-y divide-sage-50">
            {filteredCandidates.length === 0 ? (
              <p className="text-sm text-sage-500 px-3 py-3">No matches.</p>
            ) : filteredCandidates.map((c) => (
              <label key={c.id} className="flex items-center gap-3 px-3 py-2.5 hover:bg-sage-50 cursor-pointer">
                <input
                  type="radio"
                  name="merge-target"
                  value={c.id}
                  checked={mergeTargetId === c.id}
                  onChange={() => setMergeTargetId(c.id)}
                  className="accent-sage-500"
                />
                <span className="text-sm">
                  <span className="text-sage-800 font-medium">{c.name}</span>
                  {c.company_name && <span className="text-sage-500"> · {c.company_name}</span>}
                </span>
              </label>
            ))}
          </div>
          {errorMessage && <p className="text-xs text-red-600 mt-2">{errorMessage}</p>}
          <div className="flex justify-end gap-2 mt-4">
            <button
              type="button"
              onClick={() => setModal(null)}
              disabled={pending}
              className="px-4 py-2 rounded-lg text-sm text-sage-700 hover:bg-gray-100 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={doMerge}
              disabled={pending || !mergeTargetId}
              className="bg-sage-500 text-white font-semibold px-4 py-2 rounded-lg text-sm hover:bg-sage-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {pending ? 'Merging…' : 'Merge'}
            </button>
          </div>
        </Modal>
      )}

      {/* Safe-delete modal */}
      {modal === 'delete' && (
        <Modal onClose={() => !pending && setModal(null)} title="Delete this client?">
          <p className="text-sm text-sage-600 mb-2">
            This client has no quotes, jobs, or invoices. Delete is permanent and removes the client plus their contacts and sites.
          </p>
          <p className="text-xs text-sage-500 mb-3">
            If you’d rather keep the audit trail, use Archive instead.
          </p>
          {errorMessage && <p className="text-xs text-red-600 mb-2">{errorMessage}</p>}
          <div className="flex justify-end gap-2 mt-2">
            <button
              type="button"
              onClick={() => setModal(null)}
              disabled={pending}
              className="px-4 py-2 rounded-lg text-sm text-sage-700 hover:bg-gray-100 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={doDelete}
              disabled={pending}
              className="bg-red-500 text-white font-semibold px-4 py-2 rounded-lg text-sm hover:bg-red-600 disabled:opacity-50"
            >
              {pending ? 'Deleting…' : 'Delete client'}
            </button>
          </div>
        </Modal>
      )}
    </div>
  )
}

function Modal({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-semibold text-sage-800">{title}</h3>
          <button onClick={onClose} aria-label="Close" className="text-sage-400 hover:text-sage-700"><X size={18} /></button>
        </div>
        {children}
      </div>
    </div>
  )
}
