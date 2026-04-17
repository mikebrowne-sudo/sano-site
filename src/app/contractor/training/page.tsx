import { getContractor } from '../_lib/get-contractor'
import Link from 'next/link'
import { BookOpen, CheckCircle } from 'lucide-react'
import clsx from 'clsx'

const CAT_STYLES: Record<string, string> = {
  onboarding: 'bg-blue-50 text-blue-700',
  cleaning_training: 'bg-amber-50 text-amber-700',
  health_and_safety: 'bg-red-50 text-red-700',
  compliance: 'bg-purple-50 text-purple-700',
  policy: 'bg-sage-100 text-sage-700',
  other: 'bg-gray-100 text-gray-600',
}

const STATUS_STYLES: Record<string, string> = {
  assigned: 'bg-blue-50 text-blue-700',
  in_progress: 'bg-amber-50 text-amber-700',
  completed: 'bg-emerald-50 text-emerald-700',
}

function fmtDate(iso: string | null) {
  if (!iso) return null
  return new Date(iso).toLocaleDateString('en-NZ', { day: 'numeric', month: 'short', year: 'numeric' })
}

export default async function ContractorTrainingPage() {
  const { supabase, contractor } = await getContractor()

  const { data: assignments } = await supabase
    .from('worker_training_assignments')
    .select('id, status, due_date, completed_at, acknowledged_at, training_modules ( id, title, category, description )')
    .eq('contractor_id', contractor.id)
    .order('status')

  const items = (assignments ?? []).map((a) => {
    const mod = a.training_modules as unknown as { id: string; title: string; category: string; description: string | null } | null
    const today = new Date().toISOString().slice(0, 10)
    const isOverdue = a.status !== 'completed' && a.due_date && a.due_date < today
    return { ...a, mod, isOverdue }
  })

  const completed = items.filter((i) => i.status === 'completed').length

  return (
    <div>
      <h1 className="text-xl font-bold text-sage-800 mb-2">Training</h1>
      <p className="text-sage-500 text-sm mb-6">{completed} of {items.length} completed</p>

      {items.length === 0 ? (
        <div className="bg-white rounded-xl border border-sage-100 p-10 text-center">
          <BookOpen size={32} className="text-sage-200 mx-auto mb-3" />
          <p className="text-sage-600 text-sm">No training assigned yet.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((item) => (
            <Link
              key={item.id}
              href={`/contractor/training/${item.id}`}
              className={clsx(
                'block bg-white rounded-xl border p-4 hover:border-sage-300 transition-colors',
                item.status === 'completed' ? 'border-sage-100 opacity-75' : item.isOverdue ? 'border-red-200' : 'border-sage-100',
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-sage-800 text-sm">{item.mod?.title ?? '—'}</span>
                    {item.status === 'completed' && <CheckCircle size={14} className="text-emerald-600 shrink-0" />}
                  </div>
                  {item.mod?.description && <p className="text-sage-500 text-xs truncate">{item.mod.description}</p>}
                  <div className="flex items-center gap-2 mt-2">
                    <span className={clsx('inline-block px-2 py-0.5 rounded-full text-[10px] font-medium capitalize', CAT_STYLES[item.mod?.category ?? 'other'])}>{(item.mod?.category ?? 'other').replace(/_/g, ' ')}</span>
                    {item.due_date && <span className={clsx('text-xs', item.isOverdue ? 'text-red-600 font-medium' : 'text-sage-500')}>Due {fmtDate(item.due_date)}</span>}
                  </div>
                </div>
                <span className={clsx('shrink-0 inline-block px-2.5 py-0.5 rounded-full text-xs font-medium capitalize', item.isOverdue ? 'bg-red-50 text-red-700' : STATUS_STYLES[item.status] ?? STATUS_STYLES.assigned)}>
                  {item.isOverdue ? 'overdue' : item.status.replace('_', ' ')}
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
