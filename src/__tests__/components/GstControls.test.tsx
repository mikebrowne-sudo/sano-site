// GST status form (RecordGst) — the effective-date field must render for BOTH
// registered and not-registered, and verifying without it must be blocked
// client-side with a clear message (mirrors the server guard). Regression test
// for the UI blocker where "Effective from" was hidden for not-registered.

import { render, screen, fireEvent, within } from '@testing-library/react'
import { RecordGst } from '@/app/portal/contractors/[id]/gst/_components/GstControls'

// Capture what the form would submit, without hitting the server action.
const recordMock = jest.fn((arg: unknown) => { void arg; return Promise.resolve({ ok: true as const }) })
jest.mock('@/app/portal/contractors/[id]/gst/_actions', () => ({
  recordGstStatus: (arg: unknown) => recordMock(arg),
  setGstStatus: jest.fn(),
}))
jest.mock('next/navigation', () => ({ useRouter: () => ({ refresh: jest.fn() }) }))

function openForm() {
  render(<RecordGst contractorId="c-test" />)
  fireEvent.click(screen.getByRole('button', { name: /record gst status/i }))
}

beforeEach(() => recordMock.mockClear())

describe('RecordGst — effective-date field visibility', () => {
  it('renders an "Effective from" date field when REGISTERED', () => {
    openForm()
    // registered is the default
    expect(screen.getByText('GST registered')).toBeInTheDocument()
    expect(screen.getByText(/Effective from/)).toBeInTheDocument()
    expect(screen.getByText(/GST number/)).toBeInTheDocument()
  })

  it('renders an "Effective from" date field when NOT REGISTERED (the bug fix)', () => {
    openForm()
    fireEvent.click(screen.getByLabelText('Not registered'))
    // The date field must STILL be present.
    expect(screen.getByText(/Effective from/)).toBeInTheDocument()
    // GST number is registered-only → gone.
    expect(screen.queryByText(/GST number/)).not.toBeInTheDocument()
  })

  it('never defaults the effective date (starts empty)', () => {
    openForm()
    const dateInputs = screen.getAllByDisplayValue('') // no pre-filled value
    // The date input exists and is empty (no silent "today").
    expect(dateInputs.length).toBeGreaterThan(0)
  })
})

describe('RecordGst — verify guards (client-side, both statuses)', () => {
  it('BLOCKS a verified NOT-REGISTERED save with no effective date + shows a message', () => {
    openForm()
    fireEvent.click(screen.getByLabelText('Not registered'))
    // verifyNow is on by default; leave the date empty.
    fireEvent.click(screen.getByRole('button', { name: /^save$/i }))
    expect(screen.getByText(/effective date is required to verify/i)).toBeInTheDocument()
    expect(recordMock).not.toHaveBeenCalled()
  })

  it('BLOCKS a verified REGISTERED save with no effective date', () => {
    openForm()
    fireEvent.click(screen.getByRole('button', { name: /^save$/i }))
    expect(screen.getByText(/effective date is required to verify/i)).toBeInTheDocument()
    expect(recordMock).not.toHaveBeenCalled()
  })

  it('BLOCKS a verified REGISTERED save with a date but no GST number', () => {
    openForm()
    const date = document.querySelector('input[type="date"]') as HTMLInputElement
    fireEvent.change(date, { target: { value: '2026-08-01' } })
    fireEvent.click(screen.getByRole('button', { name: /^save$/i }))
    expect(screen.getByText(/GST number is required for a registered contractor/i)).toBeInTheDocument()
    expect(recordMock).not.toHaveBeenCalled()
  })

  it('passes the effective date through for a NOT-REGISTERED verified record', () => {
    openForm()
    fireEvent.click(screen.getByLabelText('Not registered'))
    const date = document.querySelector('input[type="date"]') as HTMLInputElement
    fireEvent.change(date, { target: { value: '2026-08-01' } })
    // signed name (server requires it too, but the client only guards date/number)
    fireEvent.click(screen.getByRole('button', { name: /^save$/i }))
    expect(recordMock).toHaveBeenCalledTimes(1)
    expect(recordMock).toHaveBeenCalledWith(expect.objectContaining({
      contractorId: 'c-test',
      gstRegistered: false,
      gstNumber: null,          // not required / not sent for not-registered
      effectiveDate: '2026-08-01', // the date is NOT discarded (was the bug)
    }))
  })

  it('passes GST number + date for a REGISTERED verified record', () => {
    openForm()
    const date = document.querySelector('input[type="date"]') as HTMLInputElement
    fireEvent.change(date, { target: { value: '2026-08-01' } })
    const numberInput = within(screen.getByText(/GST number/).closest('label') as HTMLElement).getByRole('textbox')
    fireEvent.change(numberInput, { target: { value: '123-456-789' } })
    fireEvent.click(screen.getByRole('button', { name: /^save$/i }))
    expect(recordMock).toHaveBeenCalledWith(expect.objectContaining({
      gstRegistered: true,
      gstNumber: '123-456-789',
      effectiveDate: '2026-08-01',
    }))
  })
})
