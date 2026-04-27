'use client'

// Phase 5.5.14 — bulk selection + action bar.
//
// Three pieces:
//   <BulkSelectProvider entity ids> ... </BulkSelectProvider>
//     wraps a list page and holds selection state. `ids` is the full
//     list of selectable row ids on the current page (used for select-all).
//   <BulkSelectCheckbox id /> renders one row checkbox.
//   <BulkSelectHeader /> renders the master "select all" checkbox.
//   <BulkActionBar /> auto-mounts a sticky bar when >0 selected.
//
// Action calls re-use the single-record lifecycle actions in
// _actions/lifecycle.ts (they accept either a single id OR an array).
// On success the bar shows a flash message and clears the selection;
// the server action's revalidatePath() refreshes the row data.

import {
  createContext, useContext, useState, useTransition, useCallback,
  type ReactNode,
} from 'react'
import { Archive, ArchiveRestore, FlaskConical, X, Loader2 } from 'lucide-react'
import {
  markAsTest, archiveRecords, restoreRecords,
  type LifecycleEntity,
} from '../_actions/lifecycle'

// ── Context ────────────────────────────────────────────────────────

interface Ctx {
  entity: LifecycleEntity
  selected: Set<string>
  pageIds: string[]
  toggle: (id: string) => void
  toggleAll: () => void
  clear: () => void
  isAllSelected: boolean
  isAnySelected: boolean
}

const BulkCtx = createContext<Ctx | null>(null)

export function useBulkSelect(): Ctx {
  const ctx = useContext(BulkCtx)
  if (!ctx) throw new Error('useBulkSelect must be used inside <BulkSelectProvider>')
  return ctx
}

// ── Provider ───────────────────────────────────────────────────────

export function BulkSelectProvider({
  entity, ids, children,
}: {
  entity: LifecycleEntity
  ids: string[]
  children: ReactNode
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set())

  const toggle = useCallback((id: string) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  const toggleAll = useCallback(() => {
    setSelected((prev) => {
      const all = ids.length > 0 && ids.every((id) => prev.has(id))
      if (all) return new Set()
      return new Set(ids)
    })
  }, [ids])

  const clear = useCallback(() => setSelected(new Set()), [])

  const isAllSelected = ids.length > 0 && ids.every((id) => selected.has(id))
  const isAnySelected = selected.size > 0

  const value: Ctx = {
    entity, selected, pageIds: ids,
    toggle, toggleAll, clear,
    isAllSelected, isAnySelected,
  }

  return (
    <BulkCtx.Provider value={value}>
      {children}
      <BulkActionBar />
    </BulkCtx.Provider>
  )
}

// ── Per-row checkbox ───────────────────────────────────────────────

export function BulkSelectCheckbox({ id, label }: { id: string; label?: string }) {
  const { selected, toggle } = useBulkSelect()
  const checked = selected.has(id)
  return (
    <label
      className="inline-flex items-center cursor-pointer"
      onClick={(e) => e.stopPropagation()}
    >
      <input
        type="checkbox"
        checked={checked}
        onChange={() => toggle(id)}
        aria-label={label ?? `Select ${id}`}
        className="h-4 w-4 rounded border-sage-300 text-sage-500 focus:ring-sage-500 focus:ring-offset-0 cursor-pointer"
      />
    </label>
  )
}

// ── Header "select all" ────────────────────────────────────────────

export function BulkSelectHeader() {
  const { isAllSelected, isAnySelected, toggleAll } = useBulkSelect()
  return (
    <label className="inline-flex items-center cursor-pointer">
      <input
        type="checkbox"
        checked={isAllSelected}
        ref={(el) => {
          if (el) el.indeterminate = isAnySelected && !isAllSelected
        }}
        onChange={toggleAll}
        aria-label="Select all rows on this page"
        className="h-4 w-4 rounded border-sage-300 text-sage-500 focus:ring-sage-500 focus:ring-offset-0 cursor-pointer"
      />
    </label>
  )
}

// ── Sticky action bar + confirm modal ──────────────────────────────

type Pending = null | { kind: 'test' | 'archive' | 'restore'; ids: string[] }

function BulkActionBar() {
  const { entity, selected, isAnySelected, clear } = useBulkSelect()
  const [pending, startTransition] = useTransition()
  const [confirm, setConfirm] = useState<Pending>(null)
  const [err, setErr] = useState('')
  const [flash, setFlash] = useState('')

  if (!isAnySelected && !confirm && !flash) return null

  function run(kind: 'test' | 'archive' | 'restore') {
    setConfirm({ kind, ids: Array.from(selected) })
  }

  function confirmAction() {
    if (!confirm) return
    setErr('')
    const { kind, ids } = confirm
    startTransition(async () => {
      const fn =
        kind === 'test'    ? () => markAsTest(entity, ids) :
        kind === 'archive' ? () => archiveRecords(entity, ids) :
                             () => restoreRecords(entity, ids)
      const r = await fn()
      if ('error' in r) { setErr(r.error); return }
      setConfirm(null)
      clear()
      setFlash(
        kind === 'test'    ? `Marked ${r.count} as test.` :
        kind === 'archive' ? `Archived ${r.count}.` :
                             `Restored ${r.count}.`,
      )
      setTimeout(() => setFlash(''), 2500)
    })
  }

  return (
    <>
      {/* Sticky bar */}
      {isAnySelected && !confirm && (
        <div
          role="region"
          aria-label="Bulk actions"
          className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40 bg-sage-800 text-white rounded-xl shadow-lg flex items-center gap-2 px-4 py-3"
        >
          <span className="text-sm font-medium pr-2 border-r border-white/20 mr-2">
            {selected.size} selected
          </span>
          <button
            type="button"
            onClick={() => run('test')}
            disabled={pending}
            className="inline-flex items-center gap-1.5 text-xs font-semibold bg-amber-500/90 hover:bg-amber-500 text-white px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50"
          >
            <FlaskConical size={12} /> Mark as test
          </button>
          <button
            type="button"
            onClick={() => run('archive')}
            disabled={pending}
            className="inline-flex items-center gap-1.5 text-xs font-semibold bg-white/10 hover:bg-white/20 text-white px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50"
          >
            <Archive size={12} /> Archive
          </button>
          <button
            type="button"
            onClick={() => run('restore')}
            disabled={pending}
            className="inline-flex items-center gap-1.5 text-xs font-semibold bg-emerald-500 hover:bg-emerald-600 text-white px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50"
          >
            <ArchiveRestore size={12} /> Restore
          </button>
          <button
            type="button"
            onClick={clear}
            disabled={pending}
            className="ml-2 inline-flex items-center text-white/70 hover:text-white"
            aria-label="Clear selection"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* Confirm modal */}
      {confirm && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="bulk-confirm-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-sage-800/50 backdrop-blur-sm px-4"
        >
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <h2 id="bulk-confirm-title" className="text-lg font-semibold text-sage-800 mb-2">
              {confirm.kind === 'test'    && `Mark ${confirm.ids.length} record${confirm.ids.length === 1 ? '' : 's'} as test?`}
              {confirm.kind === 'archive' && `Archive ${confirm.ids.length} record${confirm.ids.length === 1 ? '' : 's'}?`}
              {confirm.kind === 'restore' && `Restore ${confirm.ids.length} record${confirm.ids.length === 1 ? '' : 's'}?`}
            </h2>
            <p className="text-sm text-sage-600 mb-5">
              {confirm.kind === 'test'    && 'They will be flagged as test data and dropped from live views immediately. Reversible via Restore.'}
              {confirm.kind === 'archive' && 'They will be soft-archived (deleted_at = now). They drop out of live views and can be restored later.'}
              {confirm.kind === 'restore' && 'They will be unarchived. Records flagged as test stay test — use the per-record Restore for "as live".'}
            </p>
            {err && (
              <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2 mb-3">
                {err}
              </p>
            )}
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => { setConfirm(null); setErr('') }}
                disabled={pending}
                className="px-4 py-2 rounded-lg text-sm font-medium text-sage-700 hover:bg-sage-50 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmAction}
                disabled={pending}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold bg-sage-500 hover:bg-sage-700 text-white transition-colors disabled:opacity-50"
              >
                {pending && <Loader2 size={14} className="animate-spin" />}
                {confirm.kind === 'test'    && 'Mark as test'}
                {confirm.kind === 'archive' && 'Archive'}
                {confirm.kind === 'restore' && 'Restore'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Flash */}
      {flash && (
        <div
          role="status"
          className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40 bg-emerald-600 text-white rounded-lg shadow-lg px-4 py-2 text-sm font-medium"
        >
          {flash}
        </div>
      )}
    </>
  )
}
