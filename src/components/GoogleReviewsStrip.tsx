// Live Google reviews for the public site — "photo cards that open" design.
//
// Real reviews only, straight from Sano's Google listing via the Places API
// (lib/google-places, cached 6h): the overall rating ("5.0 on Google") and
// every 4★+ review with text, each over a real Sano photo. No review count and
// no outbound link, by request. Renders NOTHING when the API isn't configured,
// fails or has no rating — never an empty or broken box.

import { getPlaceReviews, starBuckets } from '@/lib/google-places'
import { ReviewPhotoCards } from './ReviewPhotoCards'

// Sano's own photos, assigned to reviews in order.
const PHOTOS = [
  '/images/herne-bay-residential.jpg',
  '/images/cleaned-by-sano.jpg',
  '/images/deep-cleaning.jpg',
  '/images/sano-commercial-clean-auckland.jpeg',
  '/images/window-cleaning.jpg',
  '/images/cleaning-standards.jpg',
  '/images/end-of-tenancy.jpg',
  '/images/carpet-upholstery.jpg',
]

// A phrase (word for word) to pick out in green for reviews we know. Reviews
// that aren't listed simply show without a highlight.
const HIGHLIGHTS: Record<string, string> = {
  'kylie anderson': 'my home was left spotless',
  "kirsty-ann ofamo'oni": 'consistently delivered excellent service',
  'keri collins': 'so easy to communicate with',
  'jasraj suri': 'great to work with over the years',
  'shirley harford-mckenzie': 'attention to details',
}

function Stars({ rating }: { rating: number }) {
  return (
    <span className="inline-flex items-center gap-0.5" aria-hidden="true">
      {starBuckets(rating).map((b, i) => (
        <svg key={i} width={15} height={15} viewBox="0 0 20 20">
          <path d="M10 1.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8L10 14.9l-5.2 2.7 1-5.8L1.5 7.7l5.9-.9z" fill={b > 0 ? '#076653' : '#E0EAE3'} />
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

/** Reviews section: heading, rating pill and the photo cards. */
export async function GoogleReviewsStrip({
  heading = 'happy customers',
  background = 'bg-white',
}: {
  /** The green half of "Clean spaces, <heading>". */
  heading?: string
  background?: string
}) {
  const data = await getPlaceReviews()
  if (!data.configured || data.error || data.rating == null) return null
  const reviews = data.reviews
    .filter((r) => r.rating >= 4 && r.text.length > 0)
    .map((r, i) => ({
      author: r.author,
      rating: r.rating,
      text: r.text,
      relativeTime: r.relativeTime,
      photo: PHOTOS[i % PHOTOS.length],
      highlight: HIGHLIGHTS[r.author.trim().toLowerCase()] ?? null,
    }))
  if (reviews.length === 0) return null

  return (
    <section className={`section-padding section-y ${background}`}>
      <div className="container-max">
        <div className="mb-8 flex flex-col items-center gap-1 text-center">
          <span className="inline-block rounded-full border border-sage-100 bg-white px-3.5 py-1.5 text-[0.62rem] font-semibold uppercase tracking-[0.22em] text-sage-500">
            Google reviews
          </span>
          <h2 className="mt-3 font-sans font-bold text-sage-800" style={{ fontSize: 'clamp(1.6rem, 3vw, 2.25rem)', lineHeight: 1.15, letterSpacing: '-0.015em' }}>
            Clean spaces, <span className="text-sage-500">{heading}</span>
          </h2>
          <span className="mt-3 inline-flex items-center gap-2 rounded-full bg-white px-3.5 py-1.5 text-[0.8rem] font-semibold text-sage-800 shadow-[0_6px_18px_-10px_rgba(6,35,29,0.5)]">
            <Stars rating={data.rating} />
            {data.rating.toFixed(1)} on Google
          </span>
        </div>
        <ReviewPhotoCards reviews={reviews} />
      </div>
    </section>
  )
}
