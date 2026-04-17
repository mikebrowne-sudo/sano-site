import { createClient } from '@/lib/supabase-server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Pencil } from 'lucide-react'
import { AssignModule } from '../_components/AssignModule'
import clsx from 'clsx'

const CAT_STYLES: Record<string, string> = {
  onboarding: 'bg-blue-50 text-blue-700',
  cleaning_training: 'bg-amber-50 text-amber-700',
  health_and_safety: 'bg-red-50 text-red-700',
  compliance: 'bg-purple-50 text-purple-700',
  policy: 'bg-sage-100 text-sage-700',
  other: 'bg-gray-100 text-gray-600',
}

export default async function ModuleDetailPage({ params }: { params: { id: string } }) {
  const supabase = createClient()

  const [{ data: mod, error }, { data: assignments }, { data: contractors }] = await Promise.all([
    supabase.from('training_modules').select('*').eq('id', params.id).single(),
    supabase.from('worker_training_assignments').select('id, contractor_id, status, due_date, completed_at, acknowledged_at, contractors ( full_name )').eq('training_module_id', params.id).order('assigned_at', { ascending: false }),
    supabase.from('contractors').select('id, full_name').eq('status', 'active').order('full_name'),
  ])

  if (error || !mod) notFound()

  const completed = (assignments ?? []).filter((a) => a.status === 'completed').length
  const total = (assignments ?? []).length

  return (
    <div>
      <Link href="/portal/training" className="inline-flex items-center gap-1.5 text-sm text-sage-600 hover:text-sage-800 transition-colors mb-4"><ArrowLeft size={14} /> Back to training</Link>

      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-sage-800">{mod.title}</h1>
          <div className="flex items-center gap-2 mt-1">
            <span className={clsx('inline-block px-2.5 py-0.5 rounded-full text-xs font-medium capitalize', CAT_STYLES[mod.category] ?? CAT_STYLES.other)}>{mod.category.replace(/_/g, ' ')}</span>
            <span className={clsx('inline-block px-2.5 py-0.5 rounded-full text-xs font-medium capitalize', mod.status === 'active' ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-600')}>{mod.status}</span>
          </div>
        </div>
        <Link href={`/portal/training/${params.id}/edit`} className="inline-flex items-center gap-2 bg-sage-500 text-white font-medium px-4 py-2.5 rounded-lg text-sm hover:bg-sage-700 transition-colors"><Pencil size={14} /> Edit</Link>
      </div>

      <div className="max-w-3xl space-y-8">
        {mod.description && (
          <div>
            <h2 className="text-lg font-semibold text-sage-800 mb-2">Description</h2>
            <p className="text-sage-600 text-sm">{mod.description}</p>
          </div>
        )}

        {mod.content && (
          <div>
            <h2 className="text-lg font-semibold text-sage-800 mb-2">Content</h2>
            <div className="bg-white rounded-xl border border-sage-100 p-5 text-sage-700 text-sm whitespace-pre-wrap leading-relaxed">{mod.content}</div>
          </div>
        )}

        <div className="bg-sage-50 rounded-lg px-4 py-3 text-sm text-sage-600 flex items-center gap-4">
          {mod.requires_acknowledgement && <span>Requires acknowledgement</span>}
          {mod.requires_completion && <span>Requires completion</span>}
        </div>

        <div>
          <h2 className="text-lg font-semibold text-sage-800 mb-2">
            Assignments {total > 0 && <span className="text-sage-500 font-normal text-sm ml-1">({completed}/{total} completed)</span>}
          </h2>
          <AssignModule moduleId={mod.id} contractors={contractors ?? []} assignments={(assignments ?? []) as never[]} />
        </div>
      </div>
    </div>
  )
}
