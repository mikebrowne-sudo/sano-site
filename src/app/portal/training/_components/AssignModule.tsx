'use client'

import { useState, useTransition } from 'react'
import { assignModuleToContractor, assignModuleToAll, removeAssignment } from '../_actions'
import { UserPlus, Users, Trash2, CheckCircle, ChevronDown } from 'lucide-react'
import clsx from 'clsx'

interface Contractor { id: string; full_name: string }
interface Assignment {
  id: string
  contractor_id: string
  status: string
  due_date: string | null
  completed_at: string | null
  acknowledged_at: string | null
  contractors: { full_name: string } | null
}

function fmtDate(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-NZ', { day: 'numeric', month: 'short', year: 'numeric' })
}

const STATUS_STYLES: Record<string, string> = {
  assigned: 'bg-blue-50 text-blue-700',
  in_progress: 'bg-amber-50 text-amber-700',
  completed: 'bg-emerald-50 text-emerald-700',
}

export function AssignModule({
  moduleId,
  contractors,
  assignments,
}: {
  moduleId: string
  contractors: Contractor[]
  assignments: Assignment[]
}) {
  const [selectedId, setSelectedId] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [isPending, startTransition] = useTransition()
  const [msg, setMsg] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  function handleAssign() {
    if (!selectedId) return
    setError(null); setMsg(null)
    startTransition(async () => {
      const result = await assignModuleToContractor(moduleId, selectedId, dueDate || undefined)
      if (result?.error) setError(result.error)
      else { setMsg('Assigned'); setSelectedId(''); setDueDate(''); setTimeout(() => setMsg(null), 2000) }
    })
  }

  function handleAssignAll() {
    setError(null); setMsg(null)
    startTransition(async () => {
      const result = await assignModuleToAll(moduleId, dueDate || undefined)
      if (result?.error) setError(result.error)
      else { setMsg('Assigned to all'); setTimeout(() => setMsg(null), 2000) }
    })
  }

  function handleRemove(assignmentId: string) {
    startTransition(async () => {
      await removeAssignment(assignmentId, moduleId)
    })
  }

  const assignedIds = new Set(assignments.map((a) => a.contractor_id))
  const unassigned = contractors.filter((c) => !assignedIds.has(c.id))

  return (
    <div className="space-y-4">
      {/* Assign form */}
      <div className="flex flex-wrap items-end gap-3">
        <label className="block flex-1 min-w-[200px]">
          <span className="block text-sm font-semibold text-sage-800 mb-1.5">Assign to</span>
          <div className="relative">
            <select value={selectedId} onChange={(e) => setSelectedId(e.target.value)} className="w-full appearance-none rounded-lg border border-sage-200 px-4 py-3 pr-10 text-sage-800 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-sage-500">
              <option value="">Select contractor…</option>
              {unassigned.map((c) => <option key={c.id} value={c.id}>{c.full_name}</option>)}
            </select>
            <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-sage-400 pointer-events-none" />
          </div>
        </label>
        <label className="block">
          <span className="block text-sm font-semibold text-sage-800 mb-1.5">Due date</span>
          <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className="rounded-lg border border-sage-200 px-4 py-3 text-sm text-sage-800 focus:outline-none focus:ring-2 focus:ring-sage-500" />
        </label>
        <button onClick={handleAssign} disabled={isPending || !selectedId} className="inline-flex items-center gap-2 bg-sage-500 text-white font-medium px-4 py-3 rounded-lg text-sm hover:bg-sage-700 transition-colors disabled:opacity-50">
          <UserPlus size={14} /> Assign
        </button>
        <button onClick={handleAssignAll} disabled={isPending} className="inline-flex items-center gap-2 border border-sage-200 text-sage-700 font-medium px-4 py-3 rounded-lg text-sm hover:bg-sage-50 transition-colors disabled:opacity-50">
          <Users size={14} /> Assign all
        </button>
      </div>

      {msg && <p className="text-sm text-emerald-700 flex items-center gap-1.5"><CheckCircle size={14} /> {msg}</p>}
      {error && <p className="text-sm text-red-600">{error}</p>}

      {/* Current assignments */}
      {assignments.length > 0 && (
        <div className="space-y-2 mt-4">
          {assignments.map((a) => {
            const name = (a.contractors as unknown as { full_name: string } | null)?.full_name ?? '—'
            const today = new Date().toISOString().slice(0, 10)
            const isOverdue = a.status !== 'completed' && a.due_date && a.due_date < today
            return (
              <div key={a.id} className="flex items-center justify-between bg-sage-50 rounded-lg px-4 py-3 text-sm">
                <div className="flex items-center gap-3">
                  <span className="font-medium text-sage-800">{name}</span>
                  <span className={clsx('inline-block px-2 py-0.5 rounded-full text-xs font-medium capitalize', isOverdue ? 'bg-red-50 text-red-700' : STATUS_STYLES[a.status] ?? STATUS_STYLES.assigned)}>
                    {isOverdue ? 'overdue' : a.status.replace('_', ' ')}
                  </span>
                </div>
                <div className="flex items-center gap-3 text-xs text-sage-500">
                  {a.due_date && <span>Due {fmtDate(a.due_date)}</span>}
                  {a.completed_at && <span>Completed {fmtDate(a.completed_at)}</span>}
                  <button onClick={() => handleRemove(a.id)} disabled={isPending} className="text-sage-400 hover:text-red-500 transition-colors"><Trash2 size={13} /></button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
