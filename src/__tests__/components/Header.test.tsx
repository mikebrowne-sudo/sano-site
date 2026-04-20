import { render, screen, fireEvent } from '@testing-library/react'
import { Header } from '@/components/Header'

// Mock IntersectionObserver — not available in jsdom
global.IntersectionObserver = class IntersectionObserver {
  constructor() {}
  disconnect() { return undefined }
  observe() { return undefined }
  takeRecords() { return [] }
  unobserve() { return undefined }
} as unknown as typeof IntersectionObserver

jest.mock('next/navigation', () => ({
  usePathname: () => '/',
}))

jest.mock('next/link', () => {
  return function MockLink({ href, children, ...props }: { href: string; children: React.ReactNode; [key: string]: unknown }) {
    return <a href={href} {...(props as object)}>{children}</a>
  }
})

describe('Header — top bar', () => {
  it('renders the phone label', () => {
    render(<Header />)
    expect(screen.getByText('Call us for a free quote')).toBeInTheDocument()
  })

  it('renders the phone number', () => {
    render(<Header />)
    expect(screen.getByText('0800 726 686')).toBeInTheDocument()
  })
})

describe('Header — main bar', () => {
  it('renders the Sano logo image', () => {
    render(<Header />)
    expect(screen.getByAltText('Sano')).toBeInTheDocument()
  })

  it('renders all desktop nav labels', () => {
    render(<Header />)
    expect(screen.getByRole('link', { name: 'Home' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /services/i })).toBeInTheDocument()
expect(screen.getByRole('link', { name: 'Blog' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /about/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Contact Us' })).toBeInTheDocument()
  })

  it('renders the Get a Quote CTA', () => {
    render(<Header />)
    expect(screen.getByRole('link', { name: /get a quote/i })).toBeInTheDocument()
  })
})

describe('Header — Services dropdown', () => {
  it('is hidden by default', () => {
    render(<Header />)
    expect(screen.queryByText('All Services')).not.toBeInTheDocument()
  })

  it('shows on mouse enter', () => {
    render(<Header />)
    const btn = screen.getByRole('button', { name: /services/i })
    fireEvent.mouseEnter(btn.closest('div')!)
    expect(screen.getByText('All Services')).toBeInTheDocument()
    expect(screen.getByText('Regular House Cleaning')).toBeInTheDocument()
    expect(screen.getByText('Post-Construction Cleaning')).toBeInTheDocument()
  })

  it('hides on mouse leave', () => {
    render(<Header />)
    const btn = screen.getByRole('button', { name: /services/i })
    fireEvent.mouseEnter(btn.closest('div')!)
    fireEvent.mouseLeave(btn.closest('div')!)
    expect(screen.queryByText('All Services')).not.toBeInTheDocument()
  })
})

describe('Header — About dropdown', () => {
  it('is hidden by default', () => {
    render(<Header />)
    expect(screen.queryByText('About Us')).not.toBeInTheDocument()
  })

  it('shows all About links on mouse enter', () => {
    render(<Header />)
    const btn = screen.getByRole('button', { name: /about/i })
    fireEvent.mouseEnter(btn.closest('div')!)
    expect(screen.getByText('About Us')).toBeInTheDocument()
    expect(screen.getByText('Service Area')).toBeInTheDocument()
    expect(screen.getByText('Our Guarantee')).toBeInTheDocument()
    expect(screen.getByText('Our Policies')).toBeInTheDocument()
    expect(screen.getByText('FAQ')).toBeInTheDocument()
  })

  it('hides on mouse leave', () => {
    render(<Header />)
    const btn = screen.getByRole('button', { name: /about/i })
    fireEvent.mouseEnter(btn.closest('div')!)
    fireEvent.mouseLeave(btn.closest('div')!)
    expect(screen.queryByText('About Us')).not.toBeInTheDocument()
  })
})

describe('Header — mobile menu', () => {
  it('is hidden by default', () => {
    render(<Header />)
    expect(screen.queryByRole('navigation', { name: /mobile navigation/i })).not.toBeInTheDocument()
  })

  it('opens on hamburger click', () => {
    render(<Header />)
    fireEvent.click(screen.getByRole('button', { name: /toggle menu/i }))
    expect(screen.getByRole('navigation', { name: /mobile navigation/i })).toBeInTheDocument()
  })

  it('closes on second hamburger click', () => {
    render(<Header />)
    const hamburger = screen.getByRole('button', { name: /toggle menu/i })
    fireEvent.click(hamburger)
    fireEvent.click(hamburger)
    expect(screen.queryByRole('navigation', { name: /mobile navigation/i })).not.toBeInTheDocument()
  })

  it('shows phone number in mobile menu', () => {
    render(<Header />)
    fireEvent.click(screen.getByRole('button', { name: /toggle menu/i }))
    const mobileNav = screen.getByRole('navigation', { name: /mobile navigation/i })
    expect(mobileNav).toHaveTextContent('0800 726 686')
  })

  it('shows all service links in mobile menu', () => {
    render(<Header />)
    fireEvent.click(screen.getByRole('button', { name: /toggle menu/i }))
    const mobileNav = screen.getByRole('navigation', { name: /mobile navigation/i })
    expect(mobileNav).toHaveTextContent('Regular House Cleaning')
    expect(mobileNav).toHaveTextContent('Post-Construction Cleaning')
  })

  it('shows all About links in mobile menu', () => {
    render(<Header />)
    fireEvent.click(screen.getByRole('button', { name: /toggle menu/i }))
    const mobileNav = screen.getByRole('navigation', { name: /mobile navigation/i })
    expect(mobileNav).toHaveTextContent('About Us')
    expect(mobileNav).toHaveTextContent('Our Guarantee')
  })
})
