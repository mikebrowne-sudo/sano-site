import { ContractorForm } from '../_components/ContractorForm'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

export default function NewContractorPage() {
  return (
    <div>
      <Link
        href="/portal/contractors"
        className="inline-flex items-center gap-1.5 text-sm text-sage-600 hover:text-sage-800 transition-colors mb-4"
      >
        <ArrowLeft size={14} />
        Back to contractors
      </Link>

      <h1 className="text-2xl font-bold text-sage-800 mb-8">New Contractor</h1>

      <ContractorForm />
    </div>
  )
}
