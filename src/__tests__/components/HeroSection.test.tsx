import { render } from '@testing-library/react'
import { HeroSection } from '@/components/HeroSection'

// Mock IntersectionObserver — not available in jsdom
global.IntersectionObserver = class IntersectionObserver {
  constructor() {}
  disconnect() { return undefined }
  observe() { return undefined }
  takeRecords() { return [] }
  unobserve() { return undefined }
} as unknown as typeof IntersectionObserver

jest.mock('next/image', () => ({
  __esModule: true,
  default: ({ src, alt }: { src: string; alt: string }) => <img src={src} alt={alt} />,
}))

jest.mock('@/components/QuoteButton', () => ({
  QuoteButton: () => <button>Get a Quote</button>,
}))

const baseProps = {
  headline: 'Test Headline',
  subtext: 'Test subtext',
  imageUrl: '/test.jpg',
  imageAlt: 'Test image',
  showSecondaryButton: false,
}

describe('HeroSection centred prop', () => {
  it('does not add text-center class by default', () => {
    const { container } = render(<HeroSection {...baseProps} />)
    const content = container.querySelector('[class*="container-max"]')
    expect(content?.className).not.toContain('text-center')
  })

  it('adds text-center and mx-auto when centred=true', () => {
    const { container } = render(<HeroSection {...baseProps} centred />)
    const content = container.querySelector('[class*="container-max"]')
    expect(content?.className).toContain('text-center')
  })
})
