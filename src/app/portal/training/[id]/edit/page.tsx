import { createClient } from '@/lib/supabase-server'
import { notFound } from 'next/navigation'
import { ModuleForm } from '../../_components/ModuleForm'
import { BackLink } from '../../../_components/BackLink'

export default async function EditModulePage({ params }: { params: { id: string } }) {
  const supabase = createClient()

  const { data: mod, error } = await supabase
    .from('training_modules')
    .select('id, title, category, description, content, status, requires_acknowledgement, requires_completion, sort_order, version, document_url, document_label')
    .eq('id', params.id)
    .single()

  if (error || !mod) notFound()

  return (
    <div>
      <BackLink fallbackHref={`/portal/training/${params.id}`} label="Back to module" />
      <h1 className="text-2xl font-bold text-sage-800 mb-8">Edit {mod.title}</h1>
      <ModuleForm module={mod} />
    </div>
  )
}
