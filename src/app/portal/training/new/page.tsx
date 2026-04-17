import { ModuleForm } from '../_components/ModuleForm'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

export default function NewModulePage() {
  return (
    <div>
      <Link href="/portal/training" className="inline-flex items-center gap-1.5 text-sm text-sage-600 hover:text-sage-800 transition-colors mb-4"><ArrowLeft size={14} /> Back to training</Link>
      <h1 className="text-2xl font-bold text-sage-800 mb-8">New Training Module</h1>
      <ModuleForm />
    </div>
  )
}
