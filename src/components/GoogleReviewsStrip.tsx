// Live Google rating + recent reviews for the public site.
//
// Real reviews only, straight from Sano's Google listing via the Places API
// (lib/google-places, cached 6h). The overall rating and count are shown as
// Google reports them; of the few reviews Google returns we show up to three
// 4★+ ones that have text. Renders NOTHING when the API isn't configured, fails
// or has no rating — the page never shows an empty or broken trust block.

import { getPlaceReviews, formatReviewCount, starBuckets } from '@/lib/google-places'

function Stars({ rating, size = 16 }: { rating: number; size?: number }) {
  return (
    <span className="inline-flex items-center gap-0.5" aria-hidden="true">
      {starBuckets(rating).map((b, i) => (
        <svg key={i} width={size} height={size} viewBox="0 0 20 20">
          <defs>
            <linearGradient id={`half-${i}-${size}`}>
              <stop offset="50%" stopColor="#076653" />
              <stop offset="50%" stopColor="#E0EAE3" />
            </linearGradient>
          </defs>
          <path
            d="M10 1.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8L10 14.9l-5.2 2.7 1-5.8L1.5 7.7l5.9-.9z"
            fill={b === 1 ? '#076653' : b === 0.5 ? `url(#half-${i}-${size})` : '#E0EAE3'}
          />
        </svg>
      ))}
    </span>
  )
}

function googleListingUrl(): string {
  const placeId = process.env.SANO_GOOGLE_PLACE_ID?.trim()
  return placeId
    ? `https://search.google.com/local/reviews?placeid=${encodeURIComponent(placeId)}`
    : 'https://www.google.com/search?q=Sano+Property+Services+Auckland+reviews'
}

/** Compact one-line rating (for the contact page / tight spots). */
export async function GoogleRatingLine() {
  const data = await getPlaceReviews()
  if (!data.configured || data.error || data.rating == null || !data.total) return null
  return (
    <a
      href={googleListingUrl()}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-2 text-sm text-sage-700 hover:text-sage-800"
    >
      <Stars rating={data.rating} />
      <span className="font-semibold text-sage-800">{data.rating.toFixed(1)}</span>
      <span>from {formatReviewCount(data.total)} on Google</span>
    </a>
  )
}

/** Full section: headline rating + up to three review cards. */
export async function GoogleReviewsStrip({ heading = 'What our customers say', className = 'bg-white' }: { heading?: string; className?: string }) {
  const data = await getPlaceReviews()
  if (!data.configured || data.error || data.rating == null || !data.total) return null
  const reviews = data.reviews.filter((r) => r.rating >= 4 && r.text.length > 0).slice(0, 3)

  return (
    <section className={`section-padding section-y ${className}`}>
      <div className="container-max">
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-[0.6875rem] font-semibold uppercase tracking-[0.2em] text-sage-500">GOOGLE REVIEWS</p>
          <h2 className="mt-3 font-display font-bold text-sage-800" style={{ fontSize: 'clamp(1.75rem, 3vw, 2.25rem)', lineHeight: 1.15 }}>
            {heading}
          </h2>
          <div className="mt-4 inline-flex flex-wrap items-center justify-center gap-2 text-sage-700">
            <Stars rating={data.rating} size={20} />
            <span className="text-lg font-semibold text-sage-800">{data.rating.toFixed(1)}</span>
            <span className="text-[0.9375rem]">from {formatReviewCount(data.total)} on Google</span>
          </div>
        </div>

        {reviews.length > 0 && (
          <ul className="mt-10 grid grid-cols-1 gap-5 md:grid-cols-3">
            {reviews.map((r) => (
              <li key={r.time || r.author} className="flex flex-col rounded-2xl border border-sage-100 bg-white p-6 shadow-sm">
                <Stars rating={r.rating} />
                <p className="mt-3 flex-1 text-[0.9375rem] leading-relaxed text-sage-700 line-clamp-6">
                  &ldquo;{r.text}&rdquo;
                </p>
                <p className="mt-4 text-sm font-semibold text-sage-800">{r.author}</p>
                {r.relativeTime && <p className="text-xs text-sage-600">{r.relativeTime} · Google</p>}
              </li>
            ))}
          </ul>
        )}

        <p className="mt-8 text-center">
          <a
            href={googleListingUrl()}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[0.875rem] font-semibold text-sage-500 hover:text-sage-700"
          >
            Read all reviews on Google →
          </a>
        </p>
      </div>
    </section>
  )
}
