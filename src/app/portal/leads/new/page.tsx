import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { LeadForm } from '../_components/LeadForm'

export default function NewLeadPage() {
  return (
    <div>
      <Link
        href="/portal/leads"
        className="inline-flex items-center gap-1.5 text-sm text-sage-600 hover:text-sage-800 transition-colors mb-6"
      >
        <ArrowLeft size={14} />
        Back to leads
      </Link>
      <h1 className="text-3xl font-bold text-sage-800 tracking-tight mb-8">New Lead</h1>
      <LeadForm />
    </div>
  )
}
