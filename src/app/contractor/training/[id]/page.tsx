import { getContractor } from '../../_lib/get-contractor'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { TrainingActions } from './_components/TrainingActions'
import clsx from 'clsx'

const CAT_STYLES: Record<string, string> = {
  onboarding: 'bg-blue-50 text-blue-700',
  cleaning_training: 'bg-amber-50 text-amber-700',
  health_and_safety: 'bg-red-50 text-red-700',
  compliance: 'bg-purple-50 text-purple-700',
  policy: 'bg-sage-100 text-sage-700',
  other: 'bg-gray-100 text-gray-600',
}

function fmtDate(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-NZ', { day: 'numeric', month: 'short', year: 'numeric' })
}

export default async function ContractorTrainingDetailPage({ params }: { params: { id: string } }) {
  const { supabase, contractor } = await getContractor()

  const { data: assignment, error } = await supabase
    .from('worker_training_assignments')
    .select('id, status, due_date, completed_at, acknowledged_at, training_modules ( id, title, category, description, content, requires_acknowledgement, requires_completion )')
    .eq('id', params.id)
    .eq('contractor_id', contractor.id)
    .single()

  if (error || !assignment) redirect('/contractor/training')

  const mod = assignment.training_modules as unknown as {
    id: string; title: string; category: string; description: string | null
    content: string | null; requires_acknowledgement: boolean; requires_completion: boolean
  } | null

  return (
    <div className="pb-8">
      <Link href="/contractor/training" className="inline-flex items-center gap-1.5 text-sm text-sage-500 hover:text-sage-700 transition-colors mb-5">
        <ArrowLeft size={14} /> Training
      </Link>

      <div className="mb-6">
        <h1 className="text-xl font-bold text-sage-800">{mod?.title ?? '—'}</h1>
        <div className="flex items-center gap-2 mt-1">
          <span className={clsx('inline-block px-2.5 py-0.5 rounded-full text-xs font-medium capitalize', CAT_STYLES[mod?.category ?? 'other'])}>{(mod?.category ?? 'other').replace(/_/g, ' ')}</span>
          {assignment.due_date && <span className="text-xs text-sage-500">Due {fmtDate(assignment.due_date)}</span>}
        </div>
      </div>

      <TrainingActions
        assignmentId={assignment.id}
        status={assignment.status}
        acknowledgedAt={assignment.acknowledged_at}
        completedAt={assignment.completed_at}
        requiresAck={mod?.requires_acknowledgement ?? false}
        requiresCompletion={mod?.requires_completion ?? true}
      />

      {mod?.description && (
        <div className="bg-white rounded-2xl border border-sage-100 p-5 mt-5">
          <h2 className="text-xs text-sage-500 font-semibold uppercase tracking-wide mb-2">Overview</h2>
          <p className="text-sage-700 text-sm leading-relaxed">{mod.description}</p>
        </div>
      )}

      {mod?.content && (
        <div className="bg-white rounded-2xl border border-sage-100 p-5 mt-4">
          <h2 className="text-xs text-sage-500 font-semibold uppercase tracking-wide mb-3">Content</h2>
          <div className="text-sage-700 text-sm whitespace-pre-wrap leading-relaxed">{mod.content}</div>
        </div>
      )}

      {assignment.completed_at && (
        <div className="bg-emerald-50 rounded-2xl border border-emerald-200 p-4 mt-5 text-sm text-emerald-700">
          Completed on {fmtDate(assignment.completed_at)}
        </div>
      )}
    </div>
  )
}
