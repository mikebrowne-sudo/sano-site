import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { JobApprovePayButton } from '@/app/portal/jobs/[id]/_components/JobApprovePayButton'
import { approveContractorPay } from '@/app/portal/contractor-invoices/_actions-approve-pay'

jest.mock('next/navigation', () => ({ useRouter: () => ({ refresh: jest.fn() }) }))
jest.mock('@/app/portal/contractor-invoices/_actions-approve-pay', () => ({
  approveContractorPay: jest.fn(),
}))

const mockApprove = approveContractorPay as unknown as jest.Mock

function base(overrides = {}) {
  return {
    jobId: 'j1',
    contractorId: 'c1',
    contractorName: 'Kritika Kumar',
    mode: 'hourly' as 'hourly' | 'fixed',
    defaultApprovedHours: 4,
    rate: 35,
    computedAmount: 140,
    existingCI: null,
    ...overrides,
  }
}

beforeEach(() => mockApprove.mockReset())

describe('JobApprovePayButton', () => {
  it('shows the already-approved state when a CI exists (no approve button)', () => {
    render(<JobApprovePayButton {...base({ existingCI: { id: 'ci9', invoice_number: 'CI-0099', amount: 140, status: 'approved' } })} />)
    const link = screen.getByText(/Already approved for pay/i).closest('a')
    expect(link).toHaveAttribute('href', '/portal/contractor-invoices/ci9')
    expect(screen.getByText(/CI-0099/)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Approve for pay/i })).not.toBeInTheDocument()
  })

  it('hourly: approves with approvedHours', async () => {
    mockApprove.mockResolvedValue({ ok: true, payable: { id: 'ci1', invoice_number: 'CI-0100', amount: 140, status: 'approved' } })
    render(<JobApprovePayButton {...base()} />)
    fireEvent.click(screen.getByRole('button', { name: /Approve for pay/i }))
    fireEvent.click(screen.getByRole('button', { name: /^Approve for pay$/i }))
    await waitFor(() => expect(mockApprove).toHaveBeenCalledWith('j1', 'c1', { approvedHours: 4 }))
  })

  it('fixed: approves with fixedAmount', async () => {
    mockApprove.mockResolvedValue({ ok: true, payable: { id: 'ci2', invoice_number: 'CI-0101', amount: 280, status: 'approved' } })
    render(<JobApprovePayButton {...base({ mode: 'fixed', defaultApprovedHours: null, rate: null, computedAmount: null })} />)
    fireEvent.click(screen.getByRole('button', { name: /Approve for pay/i }))
    fireEvent.change(screen.getByLabelText('Fixed amount'), { target: { value: '280' } })
    fireEvent.click(screen.getByRole('button', { name: /^Approve for pay$/i }))
    await waitFor(() => expect(mockApprove).toHaveBeenCalledWith('j1', 'c1', { fixedAmount: 280 }))
  })

  it('blocks approval when hours are missing', async () => {
    render(<JobApprovePayButton {...base({ defaultApprovedHours: null })} />)
    fireEvent.click(screen.getByRole('button', { name: /Approve for pay/i }))
    fireEvent.click(screen.getByRole('button', { name: /^Approve for pay$/i }))
    await screen.findByText(/Enter approved hours/i)
    expect(mockApprove).not.toHaveBeenCalled()
  })
})
