import { getContractor } from '../_lib/get-contractor'
import { loadContractorTraining } from '../_lib/contractor-training-data'
import { ContractorTrainingView } from '../_views/ContractorTrainingView'

export default async function ContractorTrainingPage() {
  const { supabase, contractor } = await getContractor()
  const items = await loadContractorTraining(supabase, contractor.id)

  return (
    <ContractorTrainingView
      items={items}
      itemHref={(id) => `/contractor/training/${id}`}
    />
  )
}
