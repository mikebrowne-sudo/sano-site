// Public token-keyed render route for an invoice-based remittance batch.
// PDF source + view link. Token-keyed + service-role (the token is the
// secret).

import { notFound } from 'next/navigation'
import { getRemittanceBatchByToken } from '@/lib/contractor-remittance-data'
import { ContractorRemittanceDocument } from '@/components/ContractorRemittanceDocument'

export const dynamic = 'force-dynamic'

export default async function RemittanceBatchPage({ params }: { params: { token: string } }) {
  const data = await getRemittanceBatchByToken(params.token)
  if (!data) notFound()
  return <ContractorRemittanceDocument data={data} />
}
