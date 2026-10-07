import { notFound } from 'next/navigation'
import { getSetupByToken } from '@/lib/contractor-setup-data'
import { getContractorSafeDeclarationByToken } from '@/lib/contractor-tax-declaration-data'
import { getContractorSafeGstByToken } from '@/lib/contractor-gst-history-data'
import { ContractorSetupForm } from './_components/ContractorSetupForm'
import { TaxDeclarationForm } from './_components/TaxDeclarationForm'
import { GstDeclarationForm } from './_components/GstDeclarationForm'

export const dynamic = 'force-dynamic'

export default async function ContractorSetupTokenPage({ params }: { params: { token: string } }) {
  const bundle = await getSetupByToken(params.token)
  if (!bundle) notFound()
  const taxBundle = await getContractorSafeDeclarationByToken(params.token)
  const gstBundle = await getContractorSafeGstByToken(params.token)

  return (
    <div className="min-h-screen bg-sage-50/40">
      <div className="max-w-3xl mx-auto px-4 py-10">
        <div className="mb-6">
          <p className="text-xs font-semibold uppercase tracking-wide text-sage-500">Sano contractor setup</p>
          <h1 className="text-3xl font-bold text-sage-800 tracking-tight mt-1">Welcome{bundle.contractor.fullName ? `, ${bundle.contractor.fullName.split(' ')[0]}` : ''}</h1>
          <p className="text-sm text-sage-500 mt-1">Confirm your details and check your work arrangements below. This secure link is just for you — you can come back to it later.</p>
        </div>
        <ContractorSetupForm token={params.token} contractor={bundle.contractor} schedules={bundle.schedules} />
        <div className="mt-6">
          <TaxDeclarationForm token={params.token} existing={taxBundle?.declaration ?? null} />
        </div>
        <div className="mt-6">
          <GstDeclarationForm token={params.token} existing={gstBundle?.gst ?? null} />
        </div>
      </div>
    </div>
  )
}
