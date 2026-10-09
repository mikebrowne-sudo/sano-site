// Live Google reviews for the public site.
//
// Real reviews only, straight from Sano's Google listing via the Places API
// (lib/google-places, cached 6h). Shown as a slideshow on a dark sage band:
// the overall rating ("Rated 5.0 on Google") and every 4★+ review with text.
// No review count and no outbound link, by request. Renders NOTHING when the
// API isn't configured, fails or has no rating — never an empty or broken box.

import { getPlaceReviews, starBuckets } from '@/lib/google-places'
import { ReviewsCarousel } from './ReviewsCarousel'

function Stars({ rating, size = 16, dark = false }: { rating: number; size?: number; dark?: boolean }) {
  return (
    <span className="inline-flex items-center gap-0.5" aria-hidden="true">
      {starBuckets(rating).map((b, i) => (
        <svg key={i} width={size} height={size} viewBox="0 0 20 20">
          <path
            d="M10 1.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8L10 14.9l-5.2 2.7 1-5.8L1.5 7.7l5.9-.9z"
            fill={b > 0 ? (dark ? '#7EC87A' : '#076653') : dark ? 'rgba(255,255,255,0.18)' : '#E0EAE3'}
          />
        </svg>
      ))}
    </span>
  )
}

/** Compact one-line rating (contact page). */
export async function GoogleRatingLine() {
  const data = await getPlaceReviews()
  if (!data.configured || data.error || data.rating == null) return null
  return (
    <p className="inline-flex items-center gap-2 text-sm text-sage-700">
      <Stars rating={data.rating} />
      <span>
        Rated <span className="font-semibold text-sage-800">{data.rating.toFixed(1)}</span> on Google
      </span>
    </p>
  )
}

/** Full-width reviews band with the slideshow. */
export async function GoogleReviewsStrip({
  heading = 'What our customers say',
  variant = 'band',
}: {
  heading?: string
  /** 'band' = tall dark section (commercial page); 'compact' = short light strip (homepage). */
  variant?: 'band' | 'compact'
}) {
  const data = await getPlaceReviews()
  if (!data.configured || data.error || data.rating == null) return null
  const reviews = data.reviews
    .filter((r) => r.rating >= 4 && r.text.length > 0)
    .map((r) => ({ author: r.author, rating: r.rating, text: r.text, relativeTime: r.relativeTime }))
  if (reviews.length === 0) return null

  if (variant === 'compact') {
    return (
      <section className="section-padding bg-white py-12 lg:py-14">
        <div className="container-max">
          <div className="mb-6 flex flex-col items-center gap-2 text-center">
            <h2 className="font-display font-bold text-sage-800" style={{ fontSize: 'clamp(1.375rem, 2.2vw, 1.75rem)', lineHeight: 1.2 }}>
              {heading}
            </h2>
            <p className="inline-flex items-center gap-2 text-sm text-sage-700">
              <Stars rating={data.rating} />
              <span>Rated <span className="font-semibold text-sage-800">{data.rating.toFixed(1)}</span> on Google</span>
            </p>
          </div>
          <ReviewsCarousel reviews={reviews} tone="light" />
        </div>
      </section>
    )
  }

  return (
    <section className="relative overflow-hidden bg-sage-800 section-padding py-16 lg:py-24">
      {/* Soft light from above for depth. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{ background: 'radial-gradient(ellipse at 50% -10%, rgba(126,200,122,0.16), transparent 60%)' }}
      />
      <div className="relative container-max">
        <div className="mx-auto mb-10 max-w-3xl text-center">
          <p className="text-[0.6875rem] font-semibold uppercase tracking-[0.2em] text-sage-300">GOOGLE REVIEWS</p>
          <h2 className="mt-3 font-display font-bold text-white" style={{ fontSize: 'clamp(1.75rem, 3vw, 2.25rem)', lineHeight: 1.15 }}>
            {heading}
          </h2>
          <p className="mt-4 inline-flex items-center gap-2 text-[0.9375rem] text-white/80">
            <Stars rating={data.rating} size={18} dark />
            <span>Rated <span className="font-semibold text-white">{data.rating.toFixed(1)}</span> on Google</span>
          </p>
        </div>
        <ReviewsCarousel reviews={reviews} />
      </div>
    </section>
  )
}
