// Public token-keyed remittance render route.
//
// Source for the PDF (Puppeteer hits this URL), the "view online" link
// in the remittance email, and the contractor portal's Remittances
// list. Token-keyed + service-role (like the share routes) so it
// resolves without a session; the token is the secret.

import { notFound } from 'next/navigation'
import { getRemittanceByToken } from '@/lib/remittance-data'
import { RemittanceDocument } from '@/components/RemittanceDocument'

export const dynamic = 'force-dynamic'

export default async function RemittancePage({ params }: { params: { token: string } }) {
  const data = await getRemittanceByToken(params.token)
  if (!data) notFound()
  return <RemittanceDocument data={data} />
}
