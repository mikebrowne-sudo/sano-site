import { render, screen, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom'
import { OverridePanel, type OverridePanelValue } from '../OverridePanel'

function defaultValue(overrides: Partial<OverridePanelValue> = {}): OverridePanelValue {
  return {
    is_price_overridden: false,
    override_price: '',
    override_hours: '',
    override_reason: '',
    override_confirmed: false,
    ...overrides,
  }
}

describe('OverridePanel', () => {
  it('renders the toggle, hidden panel by default', () => {
    render(<OverridePanel value={defaultValue()} onChange={() => {}} errors={{}} />)
    expect(screen.getByLabelText(/override price manually/i)).toBeInTheDocument()
    expect(screen.queryByLabelText(/custom price/i)).not.toBeInTheDocument()
    expect(screen.queryByLabelText(/reason for override/i)).not.toBeInTheDocument()
  })

  it('reveals custom price, reason, confirmation when toggle is on', () => {
    render(<OverridePanel value={defaultValue({ is_price_overridden: true })} onChange={() => {}} errors={{}} />)
    expect(screen.getByLabelText(/custom price/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/reason for override/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/i confirm this overrides/i)).toBeInTheDocument()
    expect(screen.getByText(/this price bypasses the pricing engine/i)).toBeInTheDocument()
  })

  it('calls onChange with is_price_overridden flipped when toggle clicked', () => {
    const handle = jest.fn()
    render(<OverridePanel value={defaultValue()} onChange={handle} errors={{}} />)
    fireEvent.click(screen.getByLabelText(/override price manually/i))
    expect(handle).toHaveBeenCalledWith(expect.objectContaining({ is_price_overridden: true }))
  })

  it('does not clear other fields when toggle is turned off', () => {
    const handle = jest.fn()
    const filled = defaultValue({ is_price_overridden: true, override_price: '250', override_reason: 'Negotiated', override_confirmed: true })
    render(<OverridePanel value={filled} onChange={handle} errors={{}} />)
    fireEvent.click(screen.getByLabelText(/override price manually/i))
    expect(handle).toHaveBeenCalledWith({
      is_price_overridden: false,
      override_price: '250',
      override_hours: '',
      override_reason: 'Negotiated',
      override_confirmed: true,
    })
  })

  it('shows inline errors when provided', () => {
    render(
      <OverridePanel
        value={defaultValue({ is_price_overridden: true })}
        onChange={() => {}}
        errors={{
          override_price: 'Custom price must be greater than 0.',
          override_reason: 'Reason is required.',
          override_confirmed: 'Confirmation is required to apply an override.',
        }}
      />
    )
    expect(screen.getByText(/custom price must be greater than 0/i)).toBeInTheDocument()
    expect(screen.getByText(/reason is required/i)).toBeInTheDocument()
    expect(screen.getByText(/confirmation is required/i)).toBeInTheDocument()
  })

  it('disables all controls when readOnly', () => {
    render(<OverridePanel value={defaultValue({ is_price_overridden: true })} onChange={() => {}} errors={{}} readOnly />)
    expect(screen.getByLabelText(/override price manually/i)).toBeDisabled()
    expect(screen.getByLabelText(/custom price/i)).toBeDisabled()
    expect(screen.getByLabelText(/reason for override/i)).toBeDisabled()
    expect(screen.getByLabelText(/i confirm this overrides/i)).toBeDisabled()
  })
})
