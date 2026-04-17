import Link from 'next/link'
import { createClient } from '@/lib/supabase-server'
import { BookOpen, Plus } from 'lucide-react'
import clsx from 'clsx'

const CAT_STYLES: Record<string, string> = {
  onboarding: 'bg-blue-50 text-blue-700',
  cleaning_training: 'bg-amber-50 text-amber-700',
  health_and_safety: 'bg-red-50 text-red-700',
  compliance: 'bg-purple-50 text-purple-700',
  policy: 'bg-sage-100 text-sage-700',
  other: 'bg-gray-100 text-gray-600',
}

function catLabel(c: string) { return c.replace(/_/g, ' ') }

export default async function TrainingPage() {
  const supabase = createClient()

  const { data: modules, error } = await supabase
    .from('training_modules')
    .select('id, title, category, status, sort_order')
    .order('sort_order')
    .order('title')

  if (error) {
    return (
      <div>
        <h1 className="text-2xl font-bold text-sage-800 mb-6">Training</h1>
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-red-700 text-sm">{error.message}</div>
      </div>
    )
  }

  const rows = modules ?? []

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-sage-800">Training Modules</h1>
        <Link href="/portal/training/new" className="inline-flex items-center gap-2 bg-sage-500 text-white font-semibold px-4 py-2.5 rounded-lg text-sm hover:bg-sage-700 transition-colors">
          <Plus size={16} /> New Module
        </Link>
      </div>

      {rows.length === 0 ? (
        <div className="bg-white rounded-xl border border-sage-100 p-10 text-center">
          <BookOpen size={32} className="text-sage-200 mx-auto mb-3" />
          <p className="text-sage-600 text-sm mb-4">No training modules yet.</p>
          <Link href="/portal/training/new" className="inline-flex items-center gap-2 bg-sage-500 text-white font-semibold px-4 py-2.5 rounded-lg text-sm hover:bg-sage-700 transition-colors"><Plus size={16} /> Create first module</Link>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-sage-100 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-sage-100 text-left text-sage-600">
                <th className="px-5 py-3 font-semibold">Title</th>
                <th className="px-5 py-3 font-semibold">Category</th>
                <th className="px-5 py-3 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((m) => (
                <tr key={m.id} className="border-b border-sage-50 last:border-0 group">
                  <td className="p-0"><Link href={`/portal/training/${m.id}`} className="block px-5 py-3 group-hover:bg-sage-50/50 transition-colors font-medium text-sage-800">{m.title}</Link></td>
                  <td className="p-0"><Link href={`/portal/training/${m.id}`} className="block px-5 py-3 group-hover:bg-sage-50/50 transition-colors"><span className={clsx('inline-block px-2.5 py-0.5 rounded-full text-xs font-medium capitalize', CAT_STYLES[m.category] ?? CAT_STYLES.other)}>{catLabel(m.category)}</span></Link></td>
                  <td className="p-0"><Link href={`/portal/training/${m.id}`} className="block px-5 py-3 group-hover:bg-sage-50/50 transition-colors"><span className={clsx('inline-block px-2.5 py-0.5 rounded-full text-xs font-medium capitalize', m.status === 'active' ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-600')}>{m.status}</span></Link></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
