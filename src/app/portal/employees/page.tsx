// LEGACY (Phase 7): employees now live in the unified workforce area
// (contractors, worker_type='employee'). This route is retired from the nav and
// redirects to the workforce list. The old employees table is preserved for
// history but no longer drives any UI.

import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'

export default async function EmployeesPage() {
  redirect('/portal/contractors')
}
