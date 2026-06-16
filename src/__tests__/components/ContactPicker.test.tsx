import { render, screen, fireEvent } from '@testing-library/react'
import {
  ContactPicker,
  contactsForClient,
  contactOptionLabel,
  type QuoteContact,
} from '@/app/portal/quotes/_components/ContactPicker'

const CONTACTS: QuoteContact[] = [
  { id: 'c1', client_id: 'A', full_name: 'Jamie Marshall', contact_type: 'primary', email: 'jamie@x.com', phone: null },
  { id: 'c2', client_id: 'A', full_name: 'Accounts AKL', contact_type: 'accounts', email: 'accts@x.com', phone: null },
  { id: 'c3', client_id: 'B', full_name: 'Deepika Gautam', contact_type: 'primary', email: 'd@y.com', phone: null },
]

describe('contactsForClient', () => {
  it('filters to the selected account and puts primary first', () => {
    const a = contactsForClient(CONTACTS, 'A')
    expect(a.map((c) => c.id)).toEqual(['c1', 'c2'])
  })
  it('returns nothing for no/unknown account', () => {
    expect(contactsForClient(CONTACTS, null)).toEqual([])
    expect(contactsForClient(CONTACTS, 'Z')).toEqual([])
  })
})

describe('contactOptionLabel', () => {
  it('shows name, email and an accounts tag', () => {
    expect(contactOptionLabel(CONTACTS[0])).toBe('Jamie Marshall — jamie@x.com')
    expect(contactOptionLabel(CONTACTS[1])).toBe('Accounts AKL — accts@x.com [accounts]')
    expect(contactOptionLabel({ id: 'x', client_id: 'A', full_name: null, contact_type: 'primary', email: null, phone: null }))
      .toBe('(no name)')
  })
})

describe('ContactPicker', () => {
  it('renders only the selected account contacts and fires onChange with the contact', () => {
    const onChange = jest.fn()
    render(<ContactPicker contacts={CONTACTS} clientId="A" value="" onChange={onChange} />)

    // B's contact must not appear
    expect(screen.queryByText(/Deepika Gautam/)).not.toBeInTheDocument()
    expect(screen.getByText(/Jamie Marshall/)).toBeInTheDocument()

    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'c1' } })
    expect(onChange).toHaveBeenCalledWith('c1', expect.objectContaining({ id: 'c1', full_name: 'Jamie Marshall' }))
  })

  it('shows a safe message when the account has no contacts', () => {
    render(<ContactPicker contacts={CONTACTS} clientId="Z" value="" onChange={jest.fn()} />)
    expect(screen.getByText(/No saved contacts for this account/i)).toBeInTheDocument()
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument()
  })
})
