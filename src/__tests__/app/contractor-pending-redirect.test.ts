/** @jest-environment node */

// Stage F — the legacy /portal/payroll/contractor-pending queue is retired.
// The route must forward to the canonical contractor payables worklist so
// old links / bookmarks keep working.

jest.mock('next/navigation', () => ({ redirect: jest.fn() }))

import ContractorPendingRetiredRedirect from '@/app/portal/payroll/contractor-pending/page'
import { redirect } from 'next/navigation'

describe('legacy contractor-pending route', () => {
  it('redirects to the new pending-approvals worklist', () => {
    ContractorPendingRetiredRedirect()
    expect(redirect).toHaveBeenCalledWith('/portal/contractor-invoices/pending-approvals')
  })
})
