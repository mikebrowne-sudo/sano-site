// LEGACY (Phase 7): employee detail now lives under the unified workforce area
// (contractors, worker_type='employee'). Redirects to the workforce list.

import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'

export default async function LegacyEmployeeDetailPage() {
  redirect('/portal/contractors')
}
