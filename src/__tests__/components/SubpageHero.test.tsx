import { render, screen } from '@testing-library/react'
import { SubpageHero } from '@/components/SubpageHero'

jest.mock('next/image', () => ({
  __esModule: true,
  default: ({ src, alt }: { src: string; alt: string }) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={alt} />
  ),
}))

const baseProps = {
  title: 'Test title',
  imageSrc: '/images/test.jpg',
}

describe('SubpageHero — rendering', () => {
  it('renders the title as an h1', () => {
    render(<SubpageHero {...baseProps} />)
    expect(
      screen.getByRole('heading', { level: 1, name: 'Test title' }),
    ).toBeInTheDocument()
  })

  it('renders the eyebrow when provided', () => {
    render(<SubpageHero {...baseProps} eyebrow="SERVICE LABEL" />)
    expect(screen.getByText('SERVICE LABEL')).toBeInTheDocument()
  })

  it('does not render an eyebrow element when eyebrow is omitted', () => {
    const { container } = render(<SubpageHero {...baseProps} />)
    // No <p> with the tracked-uppercase class
    expect(container.querySelector('p.uppercase')).toBeNull()
  })

  it('renders the subtitle when provided', () => {
    render(<SubpageHero {...baseProps} subtitle="Supporting copy goes here." />)
    expect(screen.getByText('Supporting copy goes here.')).toBeInTheDocument()
  })

  it('renders the background image with the provided src and alt', () => {
    render(<SubpageHero {...baseProps} imageAlt="Living room" />)
    const img = screen.getByAltText('Living room') as HTMLImageElement
    expect(img.src).toContain('/images/test.jpg')
  })

  it('falls back to empty alt when imageAlt is omitted (decorative)', () => {
    const { container } = render(<SubpageHero {...baseProps} />)
    const img = container.querySelector('img')
    expect(img).not.toBeNull()
    expect(img?.getAttribute('alt')).toBe('')
  })
})

describe('SubpageHero — titleHighlight', () => {
  it('wraps the highlighted substring in a sage-300 span', () => {
    const { container } = render(
      <SubpageHero
        {...baseProps}
        title="Clean spaces that feel good"
        titleHighlight="feel good"
      />,
    )
    const highlight = container.querySelector('span.text-sage-300')
    expect(highlight?.textContent).toBe('feel good')
  })

  it('renders title as plain text when highlight substring is not found', () => {
    const { container } = render(
      <SubpageHero
        {...baseProps}
        title="Clean spaces"
        titleHighlight="not in title"
      />,
    )
    expect(container.querySelector('span.text-sage-300')).toBeNull()
    expect(
      screen.getByRole('heading', { level: 1, name: 'Clean spaces' }),
    ).toBeInTheDocument()
  })
})

describe('SubpageHero — CTAs and chips', () => {
  it('renders primary and secondary CTAs as links with correct hrefs', () => {
    render(
      <SubpageHero
        {...baseProps}
        primaryCta={{ label: 'Get a Free Quote', href: '/contact' }}
        secondaryCta={{ label: 'See Services', href: '/services' }}
      />,
    )
    const primary = screen.getByRole('link', { name: 'Get a Free Quote' })
    const secondary = screen.getByRole('link', { name: 'See Services' })
    expect(primary).toHaveAttribute('href', '/contact')
    expect(secondary).toHaveAttribute('href', '/services')
  })

  it('does not render any CTA when neither is provided', () => {
    render(<SubpageHero {...baseProps} />)
    expect(screen.queryByRole('link')).toBeNull()
  })

  it('renders chips when provided', () => {
    render(
      <SubpageHero
        {...baseProps}
        chips={[{ label: 'Insured' }, { label: 'Vetted teams' }]}
      />,
    )
    expect(screen.getByText('Insured')).toBeInTheDocument()
    expect(screen.getByText('Vetted teams')).toBeInTheDocument()
  })
})

describe('SubpageHero — align prop', () => {
  it('does not apply text-center by default (left-aligned)', () => {
    const { container } = render(<SubpageHero {...baseProps} />)
    expect(container.querySelector('.text-center')).toBeNull()
  })

  it('applies text-center when align="center"', () => {
    const { container } = render(<SubpageHero {...baseProps} align="center" />)
    expect(container.querySelector('.text-center')).not.toBeNull()
  })
})

describe('SubpageHero — size prop', () => {
  it('renders standard height (520px) by default', () => {
    const { container } = render(<SubpageHero {...baseProps} />)
    const section = container.querySelector('section')
    expect(section?.className).toContain('h-[520px]')
  })

  it('renders compact height (380px) when size="compact"', () => {
    const { container } = render(<SubpageHero {...baseProps} size="compact" />)
    const section = container.querySelector('section')
    expect(section?.className).toContain('h-[380px]')
  })
})

describe('SubpageHero — animate prop', () => {
  it('applies the motion-safe hero-rise-item class by default', () => {
    const { container } = render(
      <SubpageHero
        {...baseProps}
        eyebrow="TEST"
        subtitle="Supporting copy."
        primaryCta={{ label: 'CTA', href: '/x' }}
      />,
    )
    expect(
      container.querySelector('.motion-safe\\:hero-rise-item'),
    ).not.toBeNull()
  })

  it('omits the motion-safe hero-rise-item class when animate=false', () => {
    const { container } = render(
      <SubpageHero
        {...baseProps}
        eyebrow="TEST"
        subtitle="Supporting copy."
        primaryCta={{ label: 'CTA', href: '/x' }}
        animate={false}
      />,
    )
    expect(container.querySelector('.motion-safe\\:hero-rise-item')).toBeNull()
  })
})
