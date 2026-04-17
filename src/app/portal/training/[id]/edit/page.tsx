import { createClient } from '@/lib/supabase-server'
import { notFound } from 'next/navigation'
import { ModuleForm } from '../../_components/ModuleForm'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

export default async function EditModulePage({ params }: { params: { id: string } }) {
  const supabase = createClient()

  const { data: mod, error } = await supabase
    .from('training_modules')
    .select('id, title, category, description, content, status, requires_acknowledgement, requires_completion, sort_order')
    .eq('id', params.id)
    .single()

  if (error || !mod) notFound()

  return (
    <div>
      <Link href={`/portal/training/${params.id}`} className="inline-flex items-center gap-1.5 text-sm text-sage-600 hover:text-sage-800 transition-colors mb-4"><ArrowLeft size={14} /> Back to module</Link>
      <h1 className="text-2xl font-bold text-sage-800 mb-8">Edit {mod.title}</h1>
      <ModuleForm module={mod} />
    </div>
  )
}
