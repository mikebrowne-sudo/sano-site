import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { CommercialCalculatorForm } from './_components/CommercialCalculatorForm'

export default function CommercialCalculatorPage() {
  return (
    <div>
      <Link
        href="/portal/quotes"
        className="inline-flex items-center gap-1.5 text-sm text-sage-600 hover:text-sage-800 transition-colors mb-4"
      >
        <ArrowLeft size={14} />
        Quotes
      </Link>

      <h1 className="text-2xl font-bold text-sage-800 mb-8">Commercial calculator</h1>

      <CommercialCalculatorForm />
    </div>
  )
}
