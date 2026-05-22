import Image from 'next/image'

/**
 * Standardised "Service Information" section used at the top of every
 * service-page body (under the SubpageHero). Mirrors the Enhanced
 * Cleaning vacate-cleaning reference: left column heading + body
 * paragraphs, right column two stacked 4:3 images.
 *
 * Used by Regular Cleaning, Deep Cleaning, End of Tenancy, Carpet &
 * Upholstery, Window Cleaning, and Post-Construction. Commercial
 * Cleaning has its own variant (quote card on the right) so it does
 * NOT use this component.
 */

interface ServiceImage {
  src: string
  alt: string
}

export interface ServiceInformationProps {
  /** Section heading. Defaults to "Service Information". */
  title?: string
  /** Body copy — one entry per paragraph. */
  body: ReadonlyArray<string>
  /** Top image on the right stack. */
  primaryImage: ServiceImage
  /** Bottom image on the right stack. */
  secondaryImage: ServiceImage
}

export function ServiceInformation({
  title = 'Service Information',
  body,
  primaryImage,
  secondaryImage,
}: ServiceInformationProps) {
  return (
    <section className="section-padding bg-white py-12 lg:py-14">
      <div className="container-max">
        <div className="grid grid-cols-1 lg:grid-cols-[1.05fr_1fr] gap-8 lg:gap-12 items-start">
          {/* Left — heading + body */}
          <div>
            <h2 className="mb-5 border-b border-sage-100 pb-4">{title}</h2>
            <div className="body-text space-y-4">
              {body.map((paragraph, i) => (
                <p key={i}>{paragraph}</p>
              ))}
            </div>
          </div>

          {/* Right — two stacked 4:3 images */}
          <div className="grid grid-cols-1 gap-4">
            <ServiceInfoImage image={primaryImage} />
            <ServiceInfoImage image={secondaryImage} />
          </div>
        </div>
      </div>
    </section>
  )
}

function ServiceInfoImage({ image }: { image: ServiceImage }) {
  return (
    <div className="relative aspect-[4/3] overflow-hidden rounded-2xl">
      <Image
        src={image.src}
        alt={image.alt}
        fill
        className="object-cover"
        sizes="(max-width: 1024px) 100vw, 45vw"
      />
    </div>
  )
}
